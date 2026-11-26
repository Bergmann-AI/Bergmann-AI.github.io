"""Fotorealistische Flakons mit Blender Cycles (Python-Modul bpy, z. B. `pip install bpy`).

  python flakon.py karte or   --out or.png  [--size 1200] [--samples 128]
  python flakon.py hero  -    --out hero.png [--size 1024] [--samples 128]

Baut den Flakon wie im Referenzvideo: dickes Kristallglas mit Hohlraum, darin die Füllung als
Volumen (Farbe je Duft), facettierter Verschluss, Goldhals, das Logo als Goldprägung innen auf der
Vorderseite. Licht: warmes Studio mit Gegenlicht (die Füllung glüht) und Kantenlichtern.
Es entstehen zwei Bilder: <out> (Farbe vor dunkler Rückwand) und <out>-maske.png (Umriss);
render.py setzt daraus die Bilder mit Transparenz zusammen.
"""
import argparse, math, sys, os
import bpy, bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))

# Füllungen: Absorption (je heller ein Kanal, desto weniger wird er geschluckt), Dichte, Leuchten von innen
# (Farbe, Stärke). Das Leuchten ist in der Mitte am stärksten, wie die von hinten durchleuchteten Flakons im Video.
LIQUIDS = {
    'hero':    ((0.88, 0.26, 0.10), 12.0, (1.0, 0.32, 0.06), 9.0),
    'or':      ((0.95, 0.52, 0.16), 7.0, (1.0, 0.55, 0.16), 20.0),
    'noir':    ((0.52, 0.32, 0.20), 16.0, (0.95, 0.38, 0.10), 5.0),
    'ambre':   ((0.93, 0.42, 0.13), 8.0, (1.0, 0.42, 0.09), 17.0),
    'rose':    ((0.97, 0.52, 0.42), 7.0, (1.0, 0.48, 0.32), 16.0),
    'fumee':   ((0.78, 0.62, 0.46), 8.0, (0.95, 0.64, 0.38), 10.0),
    'lumiere': ((0.99, 0.86, 0.58), 5.0, (1.0, 0.82, 0.48), 13.0),
}
FORMS = {
    # Breite, Höhe, Tiefe, Fasen vorn (Ecken der Vorderseite), Fasen senkrecht, Wände, Boden, Schulter, Füllstand
    'hero':  dict(w=0.78, h=1.12, d=0.38, cf=0.0, cv=0.06, wall=0.045, wfb=0.045, base=0.17, top=0.09, fill=0.95,
                  cap=(0.42, 0.28, 0.27), capcv=0.07, capbev=0.055, capcol=((0.93, 0.48, 0.28), 10.0)),
    'karte': dict(w=0.96, h=0.92, d=0.42, cf=0.0, cv=0.0, rund=0.13, wall=0.085, wfb=0.065, base=0.13, top=0.1, fill=0.97,
                  cap=(0.48, 0.3, 0.3), capcv=0.06, capbev=0.035, capcol=((0.995, 0.97, 0.9), 1.0)),
}


def prism(name, w, h, d, cf, cv, bevel=0.0, seg=2):
    """Prisma (Breite X, Tiefe Y, Höhe Z), mittig. cf > 0: Vorderseite mit abgeschrägten Ecken, in die Tiefe
    gezogen (Kartenflakon). Sonst: Grundriss mit abgeschrägten senkrechten Kanten (cv), in die Höhe gezogen.
    bevel rundet danach alle Kanten leicht (Lichtkanten)."""
    bm = bmesh.new()
    if cf > 0:
        c = min(cf, w * 0.45, h * 0.45)
        pts = [(-w/2 + c, -h/2), (w/2 - c, -h/2), (w/2, -h/2 + c), (w/2, h/2 - c),
               (w/2 - c, h/2), (-w/2 + c, h/2), (-w/2, h/2 - c), (-w/2, -h/2 + c)]
        vs = [bm.verts.new((x, -d/2, z)) for x, z in pts]
        axis = Vector((0, d, 0))
    else:
        c = min(cv, w * 0.45, d * 0.45)
        if c > 0:
            pts = [(-w/2 + c, -d/2), (w/2 - c, -d/2), (w/2, -d/2 + c), (w/2, d/2 - c),
                   (w/2 - c, d/2), (-w/2 + c, d/2), (-w/2, d/2 - c), (-w/2, -d/2 + c)]
        else:
            pts = [(-w/2, -d/2), (w/2, -d/2), (w/2, d/2), (-w/2, d/2)]
        vs = [bm.verts.new((x, y, -h/2)) for x, y in pts]
        axis = Vector((0, 0, h))
    f = bm.faces.new(vs)
    res = bmesh.ops.extrude_face_region(bm, geom=[f])
    moved = [g for g in res['geom'] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=axis, verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=seg, affect='EDGES', profile=0.5, clamp_overlap=True)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = False
    return ob


def round_prism(name, w, h, d, r, bevel=0.0, seg=4, corner_seg=1):
    """Vorderseite als Rechteck mit runden Ecken (Radius r), in die Tiefe gezogen, Kanten weich gerundet."""
    bm = bmesh.new()
    r = min(r, w * 0.45, h * 0.45)
    pts = []
    for cx, cz, a0 in ((w/2 - r, -h/2 + r, -90), (w/2 - r, h/2 - r, 0), (-w/2 + r, h/2 - r, 90), (-w/2 + r, -h/2 + r, 180)):
        for k in range(corner_seg + 1):
            a = math.radians(a0 + 90 * k / corner_seg)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    vs = [bm.verts.new((x, -d/2, z)) for x, z in pts]
    f = bm.faces.new(vs)
    res = bmesh.ops.extrude_face_region(bm, geom=[f])
    moved = [g for g in res['geom'] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, d, 0)), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bevel > 0:
        # nur die Kanten von Vorder- und Rückseite runden (die Rundung der Ecken ist schon da)
        rim = [e for e in bm.edges if abs(e.verts[0].co.y - e.verts[1].co.y) < 1e-6 and abs(abs(e.verts[0].co.y) - d/2) < 1e-6]
        bmesh.ops.bevel(bm, geom=rim, offset=bevel, segments=seg, affect='EDGES', profile=0.5, clamp_overlap=True)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = True
    return ob


def apply_boolean(target, cutter):
    mod = target.modifiers.new('cut', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.object = cutter
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def principled(name, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    for k, v in kw.items():
        if k in bsdf.inputs:
            bsdf.inputs[k].default_value = v
    return m, bsdf


def glass(name, absorb=None, ior=1.5):
    m, bsdf = principled(name, **{'Base Color': (1.0, 0.97, 0.93, 1), 'Roughness': 0.0, 'IOR': ior, 'Transmission Weight': 1.0})
    if 'Dispersion' in bsdf.inputs:
        bsdf.inputs['Dispersion'].default_value = 0.18
    if absorb:
        nt = m.node_tree
        vol = nt.nodes.new('ShaderNodeVolumeAbsorption')
        vol.inputs['Color'].default_value = (*absorb[0], 1)
        vol.inputs['Density'].default_value = absorb[1]
        nt.links.new(vol.outputs['Volume'], nt.nodes['Material Output'].inputs['Volume'])
    return m


def liquid(name, spec, half):
    """Füllung: klare Oberfläche (Brechung), im Volumen Absorption und ein Leuchten, das zur Mitte zunimmt."""
    absorb, dens, glow, strength = spec
    m = glass(name, absorb=None, ior=1.36)
    nt = m.node_tree
    out = nt.nodes['Material Output']
    vab = nt.nodes.new('ShaderNodeVolumeAbsorption')
    vab.inputs['Color'].default_value = (*absorb, 1)
    vab.inputs['Density'].default_value = dens
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*glow, 1)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / half[0], 1 / half[1], 1 / half[2])
    mp.inputs['Location'].default_value = (0, 0, -0.12)
    gr = nt.nodes.new('ShaderNodeTexGradient')
    gr.gradient_type = 'SPHERICAL'
    pw = nt.nodes.new('ShaderNodeMath')
    pw.operation = 'POWER'
    pw.inputs[1].default_value = 1.35
    mul = nt.nodes.new('ShaderNodeMath')
    mul.operation = 'MULTIPLY'
    mul.inputs[1].default_value = strength
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], gr.inputs['Vector'])
    nt.links.new(gr.outputs['Fac'], pw.inputs[0])
    nt.links.new(pw.outputs['Value'], mul.inputs[0])
    nt.links.new(mul.outputs['Value'], em.inputs['Strength'])
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(vab.outputs['Volume'], add.inputs[0])
    nt.links.new(em.outputs['Emission'], add.inputs[1])
    nt.links.new(add.outputs['Shader'], out.inputs['Volume'])
    return m


def gold(name, rough=0.16):
    m, _ = principled(name, **{'Base Color': (1.0, 0.70, 0.30, 1), 'Metallic': 1.0, 'Roughness': rough})
    return m


def emblem_material(img_path):
    m = bpy.data.materials.new('Logo')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    img = bpy.data.images.load(img_path)
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    tex.interpolation = 'Cubic'
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
    bsdf.inputs['Metallic'].default_value = 0.35
    bsdf.inputs['Roughness'].default_value = 0.32
    # etwas Eigenleuchten, damit die Prägung im Glas so hell steht wie im Video
    if 'Emission Color' in bsdf.inputs:
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = 1.5
    # Prägung: Kante aus der Transparenz
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.6
    bump.inputs['Distance'].default_value = 0.002
    nt.links.new(tex.outputs['Alpha'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    m.blend_method = 'HASHED' if hasattr(m, 'blend_method') else None
    return m, img.size[:]


def area(name, size, size_y, loc, target, energy, color):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.shape = 'RECTANGLE'
    ld.size = size
    ld.size_y = size_y
    ld.energy = energy
    ld.color = color
    ob = bpy.data.objects.new(name, ld)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return ob


def build(form, liquid_key):
    F = FORMS[form]
    w, h, d = F['w'], F['h'], F['d']
    rund = F.get('rund', 0)
    parts = {}
    cw, cd = w - 2 * F['wall'], d - 2 * F['wfb']
    ch = h - F['base'] - F['top']
    k = cw / w
    # Glaskörper mit Hohlraum: Karte mit runden Ecken und weichen dicken Kanten, Hero mit Fasen
    if rund:
        body = round_prism('Glas', w, h, d, rund, bevel=0.05, seg=5)
        cav = round_prism('Hohlraum', cw, ch, cd, rund * k * 0.85, bevel=0.02, seg=3)
    else:
        body = prism('Glas', w, h, d, F['cf'], F['cv'], bevel=0.012, seg=3)
        cav = prism('Hohlraum', cw, ch, cd, F['cf'] * k, F['cv'] * k, bevel=0.008, seg=2)
    cav.location.z = -h / 2 + F['base'] + ch / 2
    bpy.context.view_layer.objects.active = cav
    apply_boolean(body, cav)
    body.data.materials.clear()
    body.data.materials.append(glass('Kristall'))
    for poly in body.data.polygons:
        poly.material_index = 0
    parts['body'] = body
    # Füllung (etwas kleiner als der Hohlraum, bis zum Füllstand), leuchtet von innen
    lh = ch * F['fill']
    lw_, ld_ = cw - 0.006, cd - 0.006
    if rund:
        liq = round_prism('Fuellung', lw_, lh - 0.006, ld_, rund * k * 0.88, bevel=0.026, seg=4)
    else:
        liq = prism('Fuellung', lw_, lh - 0.006, ld_, F['cf'] * k, F['cv'] * k, bevel=0.007, seg=2)
    liq.location.z = -h / 2 + F['base'] + 0.003 + (lh - 0.006) / 2
    liq.data.materials.append(liquid('Duft', LIQUIDS[liquid_key], (lw_ / 2, ld_ * 1.2, (lh - 0.006) / 2)))
    parts['liquid'] = liq
    # Zeichen innen auf der Vorderseite (im Spalt zwischen Glas und Füllung):
    # auf den Karten nur das B, groß wie das Zeichen im Video; auf dem Hero-Flakon das ganze Logo
    img = 'logo-zeichen.png' if form == 'karte' else 'logo-etikett.png'
    mat, (iw, ih) = emblem_material(os.path.join(HERE, img))
    lw = cw * (0.62 if form == 'karte' else 0.66)
    bpy.ops.mesh.primitive_plane_add(size=1)
    lab = bpy.context.active_object
    lab.name = 'Logo'
    lab.scale = (lw, lw * ih / iw, 1)
    lab.rotation_euler = (math.radians(90), 0, 0)
    lab.location = (0, -cd / 2 + 0.0016, liq.location.z + lh * (0.03 if form == 'karte' else 0.06))
    lab.data.materials.append(mat)
    parts['label'] = lab
    # Goldhals und Ring
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.088, depth=0.1, location=(0, 0, h / 2 + 0.05))
    neck = bpy.context.active_object
    neck.data.materials.append(gold('Gold'))
    bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.122, depth=0.024, location=(0, 0, h / 2 + 0.012))
    ring = bpy.context.active_object
    ring.data.materials.append(gold('Gold2', 0.2))
    bpy.ops.object.shade_smooth()
    # Verschluss: Kristallblock (Karte klar, Hero rubinrot)
    cx, chh, cdd = F['cap']
    cap = prism('Verschluss', cx, chh, cdd, 0.0, F['capcv'], bevel=F['capbev'], seg=1 if form == 'hero' else 2)
    cap.location.z = h / 2 + 0.1 + chh / 2
    cap.data.materials.append(glass('Verschluss', absorb=F['capcol'], ior=1.54))
    if form == 'karte':
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.045, depth=chh * 0.55, location=(0, 0, h / 2 + 0.1 + chh * 0.3))
        core = bpy.context.active_object
        core.data.materials.append(gold('Kern', 0.18))
        bpy.ops.object.shade_smooth()
    total = h + 0.1 + chh
    return parts, total


def scene_setup(size_x, size_y, samples):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.02
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    sc.cycles.max_bounces = 18
    sc.cycles.transmission_bounces = 18
    sc.cycles.glossy_bounces = 8
    sc.cycles.diffuse_bounces = 2
    sc.cycles.transparent_max_bounces = 12
    sc.cycles.volume_bounces = 2
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 0.6
    sc.render.resolution_x = size_x
    sc.render.resolution_y = size_y
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    sc.render.threads_mode = 'FIXED'
    sc.render.threads = os.cpu_count() or 4
    # 'Standard' hält die Farben satt (Orange bleibt Orange), wie bei den Flakons im Video
    sc.view_settings.view_transform = 'Standard'
    try:
        sc.view_settings.look = 'Medium High Contrast'
    except Exception:
        pass
    sc.view_settings.exposure = 0.0
    world = bpy.data.worlds.new('Welt')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.03, 0.017, 0.01, 1)
    sc.world = world
    return sc


def backdrop(form):
    """Dunkle, warme Rückwand mit weichem Schein: das Glas bricht sie (wie den Grund der Seite)."""
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 1.6, -0.02), rotation=(math.radians(90), 0, 0))
    bd = bpy.context.active_object
    bd.name = 'Rueckwand'
    m = bpy.data.materials.new('Rueckwand')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    gr = nt.nodes.new('ShaderNodeTexGradient')
    gr.gradient_type = 'QUADRATIC_SPHERE'
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.004, 0.0025, 0.002, 1)
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = (1.0, 0.5, 0.16, 1) if form == 'hero' else (1.0, 0.56, 0.2, 1)
    ramp.color_ramp.interpolation = 'EASE'
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    mp.inputs['Location'].default_value = (0.0, -0.12 if form == 'karte' else -0.05, 0)
    mp.inputs['Scale'].default_value = (0.95, 0.95, 0.95)
    nt.links.new(mp.outputs['Vector'], gr.inputs['Vector'])
    nt.links.new(gr.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    em.inputs['Strength'].default_value = 2.7 if form == 'karte' else 1.25
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    bd.data.materials.append(m)
    return bd


def softbox(name, w, h, loc, target, strength, color):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (w, h, 1)
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*color, 1)
    em.inputs['Strength'].default_value = strength
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    ob.data.materials.append(m)
    ob.visible_camera = False
    ob.visible_shadow = False
    return ob


def lights(form):
    t = (0, 0, 0.2)
    softbox('SpiegelLinks', 1.2, 4.0, (-3.0, -1.5, 0.5), t, 3.0, (1.0, 0.62, 0.28))
    softbox('SpiegelRechts', 1.2, 4.0, (3.0, -1.2, 0.8), t, 3.4, (1.0, 0.58, 0.24))
    softbox('SpiegelOben', 4.0, 2.0, (0.0, -1.0, 3.5), t, 2.2, (1.0, 0.72, 0.4))
    area('Key', 2.2, 1.3, (2.6, -3.0, 3.2), t, 160, (1.0, 0.74, 0.46))
    area('KanteLinks', 0.35, 3.5, (-2.4, -0.4, 0.4), t, 90, (0.62, 0.9, 1.0) if form == 'hero' else (1.0, 0.82, 0.6))
    area('KanteRechts', 0.35, 3.5, (2.5, 0.2, 0.3), t, 100, (1.0, 0.62, 0.3))
    area('Oben', 1.2, 1.2, (0.0, -0.6, 3.0), (0, 0, 0.6), 40, (1.0, 0.9, 0.78))


def camera(form, total, size_x, size_y):
    cam_d = bpy.data.cameras.new('Kamera')
    cam_d.lens = 85
    cam_d.sensor_width = 36
    cam = bpy.data.objects.new('Kamera', cam_d)
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    aspect = size_x / size_y
    cz = (total) / 2 - FORMS[form]['h'] / 2      # Mitte der ganzen Höhe
    vis_h = total * (1.14 if form == 'karte' else 1.1)
    fov_v = 2 * math.atan((36 / aspect) / 2 / 85) if aspect >= 1 else 2 * math.atan(36 / 2 / 85)
    if aspect >= 1:
        dist = (vis_h / 2) / math.tan(fov_v / 2)
    else:
        cam_d.sensor_fit = 'VERTICAL'
        cam_d.sensor_height = 36
        dist = (vis_h / 2) / math.tan(math.atan(18 / 85))
    elev = math.radians(6 if form == 'karte' else 3)
    cam.location = (0, -dist * math.cos(elev), cz + dist * math.sin(elev))
    d = Vector((0, 0, cz)) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return cam


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument('form', choices=['karte', 'hero'])
    ap.add_argument('duft')
    ap.add_argument('--out', required=True)
    ap.add_argument('--size', type=int, default=1200)
    ap.add_argument('--samples', type=int, default=128)
    ap.add_argument('--yaw', type=float, default=None)
    a = ap.parse_args(argv)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    liquid = 'hero' if a.form == 'hero' else a.duft
    sx, sy = (a.size, a.size) if a.form == 'karte' else (int(a.size * 0.66), a.size)
    sc = scene_setup(sx, sy, a.samples)
    sc.view_settings.exposure = -0.35 if a.form == 'karte' else -0.45
    parts, total = build(a.form, liquid)
    # alles, was zum Flakon gehört, an einen Leerkörper hängen und drehen
    piv = bpy.data.objects.new('Flakon', None)
    bpy.context.collection.objects.link(piv)
    for ob in list(bpy.context.collection.objects):
        if ob.type == 'MESH':
            ob.parent = piv
    yaw = a.yaw if a.yaw is not None else (-14 if a.form == 'karte' else -20)
    piv.rotation_euler = (0, 0, math.radians(yaw))
    bd = backdrop(a.form)
    lights(a.form)
    camera(a.form, total, sx, sy)
    # 1. Farbe vor der Rückwand
    sc.render.filepath = a.out
    bpy.ops.render.render(write_still=True)
    # 2. Umriss: ohne Rückwand, transparenter Film, wenige Proben
    bd.hide_render = True
    sc.render.film_transparent = True
    sc.cycles.film_transparent_glass = False
    sc.render.image_settings.color_mode = 'RGBA'
    sc.cycles.samples = 16
    sc.cycles.use_denoising = False
    base, ext = os.path.splitext(a.out)
    sc.render.filepath = base + '-maske' + ext
    bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    main()
