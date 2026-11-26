"""Fotorealistischer Flakon nach dem Entwurf des Inhabers (26.11.2026), gerendert mit Blender Cycles
(Python-Modul bpy, z. B. `pip install bpy`).

  python flakon.py karte or --out or.png [--size 1600] [--samples 128] [--yaw -16]
  python flakon.py hero -   --out h.png  [--size 1500] [--samples 64]  [--yaw 0]

Der Flakon: rechteckiger Kristallkörper mit facettierten Kanten und dickem Boden, darin die Füllung
als weiches Kissen (Farbe je Duft, leuchtet leicht von innen), vorne das goldene Berg-Zeichen mit
„BERGMANN AI“, Linie und „EAU DE PARFUM“, ein geriffelter Goldhals und ein Verschluss wie ein
geschliffener Edelstein. Es entstehen zwei Bilder: <out> (Farbe vor dunkler Rückwand) und
<out>-maske.png (Umriss); render.py setzt daraus die Bilder mit Transparenz zusammen.
"""
import argparse, math, sys, os
import bpy, bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))

# Füllungen: Absorption (je heller ein Kanal, desto weniger wird er geschluckt), Dichte, Leuchten (Farbe, Stärke)
LIQUIDS = {
    'hero':    ((0.81, 0.525, 0.11), 14.0, (1.0, 0.48, 0.12), 6.0),
    'or':      ((0.90, 0.62, 0.20), 10.0, (1.0, 0.58, 0.18), 6.5),
    'noir':    ((0.56, 0.36, 0.22), 18.0, (0.95, 0.42, 0.12), 2.2),
    'ambre':   ((0.84, 0.48, 0.12), 13.0, (1.0, 0.44, 0.09), 6.0),
    'rose':    ((0.95, 0.56, 0.46), 10.0, (1.0, 0.5, 0.36), 5.5),
    'fumee':   ((0.80, 0.66, 0.50), 11.0, (0.95, 0.64, 0.4), 3.6),
    'lumiere': ((0.99, 0.88, 0.62), 6.0, (1.0, 0.84, 0.52), 4.5),
}

# Maße (Einheiten ≈ 10 cm): Körper, Fasen, Glasdicken, Hohlraum, Hals, Goldkern, Verschluss
B = dict(w=0.96, h=0.98, d=0.46, ctop=0.09, cbot=0.05, rim=0.04,
         wall=0.085, wfb=0.075, base=0.17, top=0.085, cav_r=0.085, cav_bevel=0.06,
         band_r=0.159, band_h=0.014, knurl_r=0.155, knurl_h=0.07, ring_r=0.163, ring_h=0.03,
         core_r=0.105, core_h=0.15,
         gem_n=8, gem_R=0.31, gem_pav=0.085, gem_gird=0.022, gem_crown=0.11)
NECK = B['band_h'] + B['knurl_h'] + B['ring_h']
TOTAL = B['h'] + NECK + B['gem_pav'] + B['gem_gird'] + B['gem_crown']
ASPECT = 0.82      # Seitenverhältnis der Hero-Bilder (Breite/Höhe), passt für Drehungen bis ±35°
VIS = 1.18         # Bildhöhe der Hero-Bilder im Verhältnis zur ganzen Flakonhöhe (Rand für die Perspektive)
LENS = 120         # Brennweite in mm: lange Brennweite, wenig Verzerrung
DROP = 0.022       # Bildmitte so weit unter der Flakonmitte: der nahe Boden ragt in der Perspektive weiter hinaus


def link(ob):
    bpy.context.collection.objects.link(ob)
    return ob


def mesh_from_bm(name, bm, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    return link(bpy.data.objects.new(name, me))


def extrude_outline(bm, pts, d):
    """Umriss in X-Z (Vorderseite) als Fläche bei y = -d/2, in die Tiefe gezogen."""
    vs = [bm.verts.new((x, -d / 2, z)) for x, z in pts]
    f = bm.faces.new(vs)
    res = bmesh.ops.extrude_face_region(bm, geom=[f])
    moved = [g for g in res['geom'] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, d, 0)), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)


def rim_bevel(bm, d, offset, seg):
    """Kanten rund um Vorder- und Rückseite anfasen (seg=1: glatte Schlifffläche)."""
    rim = [e for e in bm.edges if abs(e.verts[0].co.y - e.verts[1].co.y) < 1e-6 and abs(abs(e.verts[0].co.y) - d / 2) < 1e-6]
    bmesh.ops.bevel(bm, geom=rim, offset=offset, segments=seg, affect='EDGES', profile=0.5, clamp_overlap=True)


def body_mesh(name):
    w, h, d, ct, cb = B['w'], B['h'], B['d'], B['ctop'], B['cbot']
    pts = [(-w/2 + cb, -h/2), (w/2 - cb, -h/2), (w/2, -h/2 + cb), (w/2, h/2 - ct),
           (w/2 - ct, h/2), (-w/2 + ct, h/2), (-w/2, h/2 - ct), (-w/2, -h/2 + cb)]
    bm = bmesh.new()
    extrude_outline(bm, pts, d)
    rim_bevel(bm, d, B['rim'], 1)
    return mesh_from_bm(name, bm)


def pillow(name, w, h, d, r, bevel, corner_seg=8):
    """Rechteck mit runden Ecken (Vorderseite), Kanten zur Tiefe weich gerundet: Hohlraum und Füllung."""
    r = min(r, w * 0.45, h * 0.45)
    pts = []
    for cx, cz, a0 in ((w/2 - r, -h/2 + r, -90), (w/2 - r, h/2 - r, 0), (-w/2 + r, h/2 - r, 90), (-w/2 + r, -h/2 + r, 180)):
        for k in range(corner_seg + 1):
            a = math.radians(a0 + 90 * k / corner_seg)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    bm = bmesh.new()
    extrude_outline(bm, pts, d)
    rim_bevel(bm, d, bevel, 4)
    return mesh_from_bm(name, bm, smooth=True)


def gem(name, R, pav, gird, crown, z0, n):
    """Verschluss wie ein geschliffener Edelstein: n-eckig, zweistufige Krone mit Tafel, Rundiste, zweistufiges Unterteil."""
    rings = [  # (Höhe über z0, Radius, Drehung in Teilschritten)
        (0.0, 0.52 * R, 0.0), (0.6 * pav, 0.86 * R, 0.5), (pav, R, 0.0), (pav + gird, R, 0.0),
        (pav + gird + 0.5 * crown, 0.86 * R, 0.5), (pav + gird + crown, 0.58 * R, 0.0)]
    step = 2 * math.pi / n
    bm = bmesh.new()
    V = [[bm.verts.new((r * math.cos((i + rot) * step), r * math.sin((i + rot) * step), z0 + z)) for i in range(n)]
         for z, r, rot in rings]
    for A, Bv, (_, _, ra), (_, _, rb) in zip(V, V[1:], rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            if ra == rb:
                bm.faces.new((A[i], A[j], Bv[j], Bv[i]))
            elif rb > ra:      # obere Reihe um einen halben Schritt versetzt
                bm.faces.new((A[i], A[j], Bv[i]))
                bm.faces.new((Bv[i], A[j], Bv[j]))
            else:              # untere Reihe versetzt
                bm.faces.new((Bv[i], Bv[j], A[i]))
                bm.faces.new((A[i], Bv[j], A[j]))
    bm.faces.new(list(reversed(V[0])))
    bm.faces.new(V[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_from_bm(name, bm)


def stroke(bm, p0, p1, w0, w1, h, y):
    """Geschliffener Goldstrich (Dach mit Grat) von p0 nach p1 in der Ebene X-Z bei Tiefe y, Grat nach vorn (-Y)."""
    p0, p1 = Vector((p0[0], 0, p0[1])), Vector((p1[0], 0, p1[1]))
    t = (p1 - p0).normalized()
    n = Vector((-t.z, 0, t.x))
    l0, l1 = p0 + n * w0 / 2, p1 + n * w1 / 2
    r0, r1 = p0 - n * w0 / 2, p1 - n * w1 / 2
    v = lambda p, dy: bm.verts.new((p.x, y + dy, p.z))
    L0, L1, R0, R1 = v(l0, 0), v(l1, 0), v(r0, 0), v(r1, 0)
    G0, G1 = v(p0, -h), v(p1, -h)
    bm.faces.new((L0, G0, G1, L1))
    bm.faces.new((G0, R0, R1, G1))
    bm.faces.new((L0, L1, R1, R0))
    bm.faces.new((L0, R0, G0))
    bm.faces.new((L1, G1, R1))


def mark(name, cx, cz, size, y):
    """Berg-Zeichen wie im Entwurf: schmaler linker und breiter rechter Schenkel, innen ein spitzer Winkel."""
    s = size
    P = lambda x, z: (cx + x * s, cz + z * s)
    bm = bmesh.new()
    stroke(bm, P(-0.54, -0.5), P(0.008, 0.507), 0.11 * s, 0.03 * s, 0.04 * s, y)
    stroke(bm, P(-0.008, 0.507), P(0.57, -0.5), 0.03 * s, 0.145 * s, 0.05 * s, y)
    stroke(bm, P(-0.43, -0.335), P(-0.02, -0.105), 0.095 * s, 0.04 * s, 0.034 * s, y)
    stroke(bm, P(-0.02, -0.105), P(0.24, -0.235), 0.04 * s, 0.006 * s, 0.022 * s, y)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_from_bm(name, bm)


def hairline(name, length, cz, y, t=0.0017):
    """Feine Goldlinie, zu den Enden hin spitz auslaufend."""
    bm = bmesh.new()
    stroke(bm, (-length / 2, cz), (0, cz), 0.0002, 2 * t, 0.6 * t, y)
    stroke(bm, (0, cz), (length / 2, cz), 2 * t, 0.0002, 0.6 * t, y)
    return mesh_from_bm(name, bm)


def text(name, body, font_file, width, cz, y, spacing=1.0, depth=0.03):
    """Schrift als Goldrelief: in der eigenen Größe gebaut, dann auf die gewünschte Breite skaliert."""
    fnt = bpy.data.fonts.load(os.path.join(HERE, font_file))
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = body
    cu.font = fnt
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    cu.space_character = spacing
    cu.extrude = depth * 0.3
    cu.bevel_depth = depth * 0.35
    cu.bevel_resolution = 2
    cu.offset = -depth * 0.35
    cu.resolution_u = 10
    ob = link(bpy.data.objects.new(name, cu))
    ob.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.view_layer.update()
    k = width / max(ob.dimensions.x, 1e-6)
    ob.scale = (k, k, k)
    ob.location = (0, y - depth * k - 0.0002, cz)
    return ob


def principled(name, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    for k, v in kw.items():
        if k in bsdf.inputs:
            bsdf.inputs[k].default_value = v
    return m, bsdf


def glass(name, ior=1.5, tint=(1.0, 0.98, 0.95), dispersion=0.15, absorb=None):
    m, bsdf = principled(name, **{'Base Color': (*tint, 1), 'Roughness': 0.0, 'IOR': ior, 'Transmission Weight': 1.0})
    if 'Dispersion' in bsdf.inputs:
        bsdf.inputs['Dispersion'].default_value = dispersion
    if absorb:
        nt = m.node_tree
        vol = nt.nodes.new('ShaderNodeVolumeAbsorption')
        vol.inputs['Color'].default_value = (*absorb[0], 1)
        vol.inputs['Density'].default_value = absorb[1]
        nt.links.new(vol.outputs['Volume'], nt.nodes['Material Output'].inputs['Volume'])
    return m


def liquid(name, spec, half):
    absorb, dens, glow, strength = spec
    m = glass(name, ior=1.36 / 1.5, tint=(1, 1, 1), dispersion=0.0)   # Duft (1,36) im Glas (1,5)
    nt = m.node_tree
    vab = nt.nodes.new('ShaderNodeVolumeAbsorption')
    vab.inputs['Color'].default_value = (*absorb, 1)
    vab.inputs['Density'].default_value = dens
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*glow, 1)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / half[0], 1 / half[1], 1 / half[2])
    mp.inputs['Location'].default_value = (-0.34, 0, -0.12)      # Glut rechts oberhalb der Mitte
    gr = nt.nodes.new('ShaderNodeTexGradient')
    gr.gradient_type = 'SPHERICAL'
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 1.5
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = strength
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], gr.inputs['Vector'])
    nt.links.new(gr.outputs['Fac'], pw.inputs[0])
    nt.links.new(pw.outputs['Value'], mul.inputs[0])
    nt.links.new(mul.outputs['Value'], em.inputs['Strength'])
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(vab.outputs['Volume'], add.inputs[0])
    nt.links.new(em.outputs['Emission'], add.inputs[1])
    nt.links.new(add.outputs['Shader'], nt.nodes['Material Output'].inputs['Volume'])
    return m


def gold(name, rough=0.14, knurl=None):
    m, bsdf = principled(name, **{'Base Color': (1.0, 0.68, 0.30, 1), 'Metallic': 1.0, 'Roughness': rough})
    if knurl:
        # Rändelung: zwei schräge Rillenscharen rund um die Achse (Winkel und Höhe), dazwischen kleine Rauten
        n_around, k_z = knurl
        nt = m.node_tree
        tc = nt.nodes.new('ShaderNodeTexCoord')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        nt.links.new(tc.outputs['Object'], sep.inputs['Vector'])
        at = nt.nodes.new('ShaderNodeMath'); at.operation = 'ARCTAN2'
        nt.links.new(sep.outputs['Y'], at.inputs[0]); nt.links.new(sep.outputs['X'], at.inputs[1])
        def wave(sign):
            mu = nt.nodes.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; mu.inputs[1].default_value = n_around
            mv = nt.nodes.new('ShaderNodeMath'); mv.operation = 'MULTIPLY'; mv.inputs[1].default_value = sign * k_z
            ad = nt.nodes.new('ShaderNodeMath'); ad.operation = 'ADD'
            sn = nt.nodes.new('ShaderNodeMath'); sn.operation = 'SINE'
            ab = nt.nodes.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'
            nt.links.new(at.outputs['Value'], mu.inputs[0]); nt.links.new(sep.outputs['Z'], mv.inputs[0])
            nt.links.new(mu.outputs['Value'], ad.inputs[0]); nt.links.new(mv.outputs['Value'], ad.inputs[1])
            nt.links.new(ad.outputs['Value'], sn.inputs[0]); nt.links.new(sn.outputs['Value'], ab.inputs[0])
            return ab
        w1, w2 = wave(1.0), wave(-1.0)
        mn = nt.nodes.new('ShaderNodeMath'); mn.operation = 'MINIMUM'
        nt.links.new(w1.outputs['Value'], mn.inputs[0]); nt.links.new(w2.outputs['Value'], mn.inputs[1])
        bump = nt.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = 1.0
        bump.inputs['Distance'].default_value = 0.003
        nt.links.new(mn.outputs['Value'], bump.inputs['Height'])
        nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def cylinder(name, r, h, z, mat, verts=128, smooth=True, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(0, 0, z + h / 2))
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    if smooth:
        bpy.ops.object.shade_smooth()
    if bevel:
        bv = ob.modifiers.new('Fase', 'BEVEL')
        bv.width = bevel
        bv.segments = 3
        bv.limit_method = 'ANGLE'
        bv.harden_normals = False
    return ob


def build(liquid_key):
    """Baut den Flakon. Gibt die Objekte zurück, die das Licht für das Gold bekommen."""
    w, h, d = B['w'], B['h'], B['d']
    # Kristallkörper; die Füllung liegt direkt am Glas (ohne Luftspalt): ihre Grenzfläche ist Glas → Duft
    body = body_mesh('Glas')
    body.data.materials.append(glass('Kristall', absorb=((0.96, 0.8, 0.58), 2.5)))
    cw, cd = w - 2 * B['wall'], d - 2 * B['wfb']
    ch = h - B['base'] - B['top']
    liq = pillow('Fuellung', cw, ch, cd, B['cav_r'], B['cav_bevel'])
    liq.location.z = -h / 2 + B['base'] + ch / 2
    liq.data.materials.append(liquid('Duft', LIQUIDS[liquid_key], (cw / 2, cd * 1.3, ch / 2)))
    # Goldzeichen, Name, Linie und „EAU DE PARFUM“ vorn auf dem Glas
    gm = gold('Gold Schrift', 0.2)
    yf = -d / 2 - 0.0003
    label = [mark('Zeichen', 0.0, 0.13, 0.25, yf),
             text('Name', 'BERGMANN AI', 'Cinzel-500.ttf', 0.465, -0.06, yf, 1.03),
             hairline('Linie', 0.39, -0.116, yf),
             text('Art', 'EAU DE PARFUM', 'Jost-400.ttf', 0.29, -0.16, yf, 1.95, depth=0.015)]
    for ob in label:
        ob.data.materials.append(gm)
    # Goldhals: glattes Band, Rändelung, glatter Ring
    z = h / 2
    neck = [cylinder('Band', B['band_r'], B['band_h'], z, gold('Band', 0.1), bevel=0.003)]
    z += B['band_h']
    neck.append(cylinder('Raendel', B['knurl_r'], B['knurl_h'], z, gold('Raendel', 0.2, knurl=(32, 190))))
    zk = z + B['knurl_h'] / 2
    z += B['knurl_h']
    neck.append(cylinder('Ring', B['ring_r'], B['ring_h'], z, gold('Ring', 0.08), bevel=0.006))
    z += B['ring_h']
    km = mark('Halszeichen', 0.0, zk, 0.045, -B['knurl_r'] - 0.0008)
    km.data.materials.append(gm)
    label.append(km)
    # Goldkern im Verschluss (geriffelt durch flache Seiten) und der Edelstein darüber
    neck.append(cylinder('Kern', B['core_r'], B['core_h'], z - 0.004, gold('Kern', 0.1), verts=18, smooth=False))
    cap = gem('Verschluss', B['gem_R'], B['gem_pav'], B['gem_gird'], B['gem_crown'], z, B['gem_n'])
    cap.data.materials.append(glass('Edelstein', ior=1.6, tint=(1.0, 0.97, 0.92), dispersion=0.2))
    return label + neck


def area(name, size, size_y, loc, target, energy, color):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.shape = 'RECTANGLE'; ld.size = size; ld.size_y = size_y; ld.energy = energy; ld.color = color
    ob = link(bpy.data.objects.new(name, ld))
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return ob


def softbox(name, w, h, loc, target, strength, color, receivers=None, through_glass=True):
    """Leuchtfläche, die nur in Spiegelungen erscheint (nicht im Bild selbst, kein Schatten).
    receivers: nur diese Objekte bekommen ihr Licht (Licht-Verknüpfung), z. B. nur das Gold."""
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (w, h, 1)
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('Z', 'Y').to_euler()
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
    ob.visible_transmission = through_glass
    if receivers:
        coll = bpy.data.collections.new(name + ' Empfänger')
        for r in receivers:
            coll.objects.link(r)
        ob.light_linking.receiver_collection = coll
    return ob


def lights(gold_objs):
    t = (0, 0, 0.12)
    # Glut von hinten (rechts stärker): lässt Kanten und Füllung leuchten
    softbox('GlutRechts', 1.5, 2.8, (1.55, 1.25, 0.35), t, 4.5, (1.0, 0.45, 0.12))
    softbox('GlutLinks', 1.0, 2.8, (-1.65, 1.15, 0.25), t, 3.6, (1.0, 0.52, 0.19))
    # Streiflichter seitlich vorn und oben für die Glaskanten
    softbox('SpiegelLinks', 0.5, 3.4, (-2.8, -1.3, 0.6), t, 1.2, (1.0, 0.72, 0.42))
    softbox('SpiegelRechts', 0.7, 3.4, (2.8, -1.0, 0.8), t, 2.8, (1.0, 0.62, 0.3))
    softbox('SpiegelOben', 3.0, 1.4, (0.0, -0.6, 3.2), t, 2.6, (1.0, 0.8, 0.55))
    # nur für das Gold (Zeichen, Schrift, Hals): weiches Licht von vorn und links, damit es hell glänzt
    for i, (ang, k) in enumerate(((-75, 6.5), (-45, 7.0), (-15, 6.0), (15, 5.0), (45, 3.6), (75, 2.6))):
        a = math.radians(ang)
        softbox(f'Gold{i}', 1.45, 2.4, (3.0 * math.sin(a), -3.0 * math.cos(a), 0.7), t, k, (1.0, 0.84, 0.62),
                receivers=gold_objs, through_glass=False)
    softbox('GoldOben', 2.6, 1.2, (-0.3, -1.6, 2.8), t, 5.0, (1.0, 0.86, 0.66), receivers=gold_objs, through_glass=False)
    area('Key', 2.0, 2.0, (-2.2, -3.2, 2.6), t, 60, (1.0, 0.84, 0.66))
    area('Oben', 1.0, 1.0, (0.3, -0.4, 3.0), (0, 0, 0.7), 55, (1.0, 0.8, 0.6))
    area('KanteRechts', 0.3, 3.0, (2.4, 0.4, 0.4), t, 110, (1.0, 0.55, 0.22))


def backdrop():
    """Dunkle Rückwand mit zwei warmen Glutflecken: sie scheinen durch Glas und Füllung."""
    bpy.ops.mesh.primitive_plane_add(size=14, location=(0, 1.7, 0.0), rotation=(math.radians(90), 0, 0))
    bd = bpy.context.active_object
    bd.name = 'Rueckwand'
    m = bpy.data.materials.new('Rueckwand')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    tc = nt.nodes.new('ShaderNodeTexCoord')

    def glow(loc, scale, power):
        mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Location'].default_value = loc
        mp.inputs['Scale'].default_value = scale
        gr = nt.nodes.new('ShaderNodeTexGradient'); gr.gradient_type = 'QUADRATIC_SPHERE'
        pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = power
        nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
        nt.links.new(mp.outputs['Vector'], gr.inputs['Vector'])
        nt.links.new(gr.outputs['Fac'], pw.inputs[0])
        return pw
    g1 = glow((-0.62, -0.1, 0), (2.2, 1.5, 1.0), 1.0)      # Glut hinter der rechten Hälfte
    g2 = glow((1.0, 0.3, 0), (2.6, 1.6, 1.0), 1.4)        # schwächer links unten
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MULTIPLY_ADD'
    mx.inputs[1].default_value = 0.5
    nt.links.new(g2.outputs['Value'], mx.inputs[0])
    nt.links.new(g1.outputs['Value'], mx.inputs[2])
    # Rauchschlieren: geben den Glaswänden warme Streifen
    nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 1.3
    nz.inputs['Detail'].default_value = 2.0
    nz.inputs['Distortion'].default_value = 1.6
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    sm = nt.nodes.new('ShaderNodeMapRange')
    sm.inputs['From Min'].default_value = 0.5
    sm.inputs['From Max'].default_value = 0.78
    sm.inputs['To Max'].default_value = 0.42
    nt.links.new(nz.outputs['Fac'], sm.inputs['Value'])
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'
    nt.links.new(mx.outputs['Value'], add.inputs[0])
    nt.links.new(sm.outputs['Result'], add.inputs[1])
    mx = add
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'EASE'
    ramp.color_ramp.elements[0].color = (0.003, 0.002, 0.0015, 1)
    ramp.color_ramp.elements[1].color = (1.0, 0.42, 0.1, 1)
    nt.links.new(mx.outputs['Value'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    em.inputs['Strength'].default_value = 1.25
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    bd.data.materials.append(m)
    bd.visible_camera = False      # nur durch das Glas zu sehen; der Schein um den Flakon kommt aus render.py
    return bd


def scene_setup(sx, sy, samples, exposure):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.012
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    sc.cycles.max_bounces = 24
    sc.cycles.transmission_bounces = 24
    sc.cycles.glossy_bounces = 10
    sc.cycles.diffuse_bounces = 2
    sc.cycles.transparent_max_bounces = 16
    sc.cycles.volume_bounces = 2
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 0.5
    sc.render.resolution_x = sx
    sc.render.resolution_y = sy
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    sc.render.image_settings.color_depth = '8'
    sc.render.threads_mode = 'FIXED'
    sc.render.threads = os.cpu_count() or 4
    sc.view_settings.view_transform = 'Standard'
    try:
        sc.view_settings.look = 'Medium High Contrast'
    except Exception:
        pass
    sc.view_settings.exposure = exposure
    world = bpy.data.worlds.new('Welt')
    world.use_nodes = True
    nt = world.node_tree
    bg = nt.nodes['Background']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 2.2
    nz.inputs['Detail'].default_value = 8.0
    nz.inputs['Roughness'].default_value = 0.6
    nz.inputs['Distortion'].default_value = 2.5
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.46
    ramp.color_ramp.elements[0].color = (0.006, 0.004, 0.003, 1)
    ramp.color_ramp.elements[1].position = 0.7
    ramp.color_ramp.elements[1].color = (1.0, 0.45, 0.12, 1)
    lp = nt.nodes.new('ShaderNodeLightPath')
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    nt.links.new(tc.outputs['Generated'], nz.inputs['Vector'])
    nt.links.new(nz.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(lp.outputs['Is Camera Ray'], mix.inputs['Factor'])
    nt.links.new(ramp.outputs['Color'], mix.inputs['A'])
    mix.inputs['B'].default_value = (0.004, 0.003, 0.002, 1)
    nt.links.new(mix.outputs['Result'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 0.5
    sc.world = world
    return sc


def camera(form):
    cam_d = bpy.data.cameras.new('Kamera')
    cam_d.lens = LENS
    cam_d.sensor_fit = 'VERTICAL'
    cam_d.sensor_height = 24
    cam = link(bpy.data.objects.new('Kamera', cam_d))
    bpy.context.scene.camera = cam
    cz = TOTAL / 2 - B['h'] / 2 - DROP
    vis_h = TOTAL * (1.16 if form == 'karte' else VIS)
    dist = (vis_h / 2) / (12 / LENS)
    elev = math.radians(6 if form == 'karte' else 5)
    cam.location = (0, -dist * math.cos(elev), cz + dist * math.sin(elev))
    cam.rotation_euler = (Vector((0, 0, cz)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    return cam


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument('form', choices=['karte', 'hero'])
    ap.add_argument('duft')
    ap.add_argument('--out', required=True)
    ap.add_argument('--size', type=int, default=1600)
    ap.add_argument('--samples', type=int, default=128)
    ap.add_argument('--yaw', type=float, default=None)
    ap.add_argument('--yaws', default=None, help='Drehfolge, z. B. -30,-25,…,30: je Winkel <out>-NN.png')
    a = ap.parse_args(argv)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sx, sy = (a.size, a.size) if a.form == 'karte' else (round(a.size * ASPECT), a.size)
    sc = scene_setup(sx, sy, a.samples, -0.35)
    gold_objs = build('hero' if a.duft in ('-', 'hero') else a.duft)
    piv = link(bpy.data.objects.new('Flakon', None))
    for ob in list(bpy.context.collection.objects):
        if ob.type in ('MESH', 'FONT') and ob is not piv:
            ob.parent = piv
    bd = backdrop()
    lights(gold_objs)
    camera(a.form)
    base, ext = os.path.splitext(a.out)
    if a.yaws:
        yaws = [float(v) for v in a.yaws.split(',')]
        outs = [f'{base}-{i:02d}' for i in range(len(yaws))]
    else:
        yaws = [a.yaw if a.yaw is not None else 20.0]
        outs = [base]
    for yaw, o in zip(yaws, outs):
        piv.rotation_euler = (0, 0, math.radians(yaw))
        sc.render.filepath = o + ext
        bpy.ops.render.render(write_still=True)
    # Umriss: ohne Rückwand, transparenter Film, wenige Proben
    bd.hide_render = True
    sc.render.film_transparent = True
    sc.cycles.film_transparent_glass = False
    sc.render.image_settings.color_mode = 'RGBA'
    sc.cycles.samples = 16
    sc.cycles.use_denoising = False
    for yaw, o in zip(yaws, outs):
        piv.rotation_euler = (0, 0, math.radians(yaw))
        sc.render.filepath = o + '-maske' + ext
        bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    main()
