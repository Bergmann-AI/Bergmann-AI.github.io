"""4x-Hochskalierung mit Real-ESRGAN (RRDBNet x4plus), ohne PyTorch.

So entstand assets/img/fenster-foto-*.webp aus _werkzeuge/quellen/fenster-original.jpg (736 x 1313):
  1. pip install onnx onnxruntime pillow numpy
  2. Gewichte laden (nicht im Repo, 64 MB, BSD-3-Lizenz von Real-ESRGAN):
     https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth
     SHA-256 4fa0d38905f75ac06eb49a7951b426670021be3018265fd191d2125df9d682f1
  3. python3 -I hochskalieren.py RealESRGAN_x4plus.pth quellen/fenster-original.jpg fenster_x4.png
  4. 86 % dieses Ergebnisses mit 14 % einer normalen Lanczos-Vergrößerung mischen (Wolken wirken sonst "gemalt"),
     die äußeren 7 % links und rechts weich ins Schwarz laufen lassen und als WebP in 2944, 2208, 1472 und 736 px Breite speichern.

- Lädt die .pth-Gewichte mit einem eingeschränkten Unpickler (nur Tensor-Rekonstruktion erlaubt,
  kein beliebiger Code), baut das Netz als ONNX-Graph und rechnet mit ONNX Runtime auf der CPU
  in überlappenden Kacheln.

Aufruf:  python3 -I upscale.py <gewichte.pth> <eingabe.jpg> <ausgabe.png> [kachel=192] [rand=16]
"""
import sys, io, zipfile, pickle, time
import numpy as np


# ---------------------------------------------------------------- Gewichte sicher laden
class _Storage:
    def __init__(self, dtype, key):
        self.dtype, self.key = dtype, key


_DTYPES = {'FloatStorage': np.float32, 'HalfStorage': np.float16, 'DoubleStorage': np.float64}


def _rebuild_tensor_v2(storage, offset, size, stride, requires_grad=False, hooks=None, metadata=None):
    return ('tensor', storage, offset, tuple(size), tuple(stride))


class SafeUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if module == 'collections' and name == 'OrderedDict':
            import collections
            return collections.OrderedDict
        if module == 'torch._utils' and name == '_rebuild_tensor_v2':
            return _rebuild_tensor_v2
        if module == 'torch' and name in _DTYPES:
            return name
        raise pickle.UnpicklingError(f'nicht erlaubt: {module}.{name}')

    def persistent_load(self, pid):
        # ('storage', storage_type, key, location, numel)
        typ, stype, key, location, numel = pid
        if typ != 'storage' or stype not in _DTYPES:
            raise pickle.UnpicklingError(f'unbekannter Speicher: {pid!r}')
        return _Storage(_DTYPES[stype], key)


def load_state(path):
    z = zipfile.ZipFile(path)
    root = z.namelist()[0].split('/')[0]
    obj = SafeUnpickler(io.BytesIO(z.read(f'{root}/data.pkl'))).load()
    cache = {}

    def materialize(t):
        _, st, off, size, stride = t
        if st.key not in cache:
            cache[st.key] = np.frombuffer(z.read(f'{root}/data/{st.key}'), dtype=st.dtype)
        buf = cache[st.key]
        item = buf.itemsize
        arr = np.lib.stride_tricks.as_strided(buf[off:], shape=size, strides=tuple(s * item for s in stride))
        return np.ascontiguousarray(arr, dtype=np.float32)

    def walk(o):
        if isinstance(o, tuple) and o and o[0] == 'tensor':
            return materialize(o)
        if isinstance(o, dict):
            return {k: walk(v) for k, v in o.items()}
        return o

    obj = walk(obj)
    for key in ('params_ema', 'params'):
        if isinstance(obj, dict) and key in obj:
            return obj[key]
    return obj


# ---------------------------------------------------------------- ONNX-Graph RRDBNet
def build_model(sd, num_block=23):
    import onnx
    from onnx import helper, TensorProto, numpy_helper
    nodes, inits = [], []
    cnt = [0]

    def uid(p):
        cnt[0] += 1
        return f'{p}_{cnt[0]}'

    def conv(x, name):
        w, b = sd[name + '.weight'], sd[name + '.bias']
        wn, bn = name + '.w', name + '.b'
        inits.append(numpy_helper.from_array(w, wn)); inits.append(numpy_helper.from_array(b, bn))
        y = uid('conv')
        nodes.append(helper.make_node('Conv', [x, wn, bn], [y], pads=[1, 1, 1, 1], kernel_shape=[3, 3]))
        return y

    def lrelu(x):
        y = uid('lrelu'); nodes.append(helper.make_node('LeakyRelu', [x], [y], alpha=0.2)); return y

    def cat(xs):
        y = uid('cat'); nodes.append(helper.make_node('Concat', xs, [y], axis=1)); return y

    def const(v):
        n = uid('c'); inits.append(numpy_helper.from_array(np.array(v, dtype=np.float32), n)); return n

    def mul(x, v):
        y = uid('mul'); nodes.append(helper.make_node('Mul', [x, const(v)], [y])); return y

    def add(a, b):
        y = uid('add'); nodes.append(helper.make_node('Add', [a, b], [y])); return y

    def up2(x):
        y = uid('up')
        nodes.append(helper.make_node('Resize', [x, '', const([1.0, 1.0, 2.0, 2.0])], [y], mode='nearest'))
        return y

    def rdb(x, p):
        x1 = lrelu(conv(x, p + '.conv1'))
        x2 = lrelu(conv(cat([x, x1]), p + '.conv2'))
        x3 = lrelu(conv(cat([x, x1, x2]), p + '.conv3'))
        x4 = lrelu(conv(cat([x, x1, x2, x3]), p + '.conv4'))
        x5 = conv(cat([x, x1, x2, x3, x4]), p + '.conv5')
        return add(mul(x5, 0.2), x)

    x = 'input'
    feat = conv(x, 'conv_first')
    h = feat
    for i in range(num_block):
        o = rdb(rdb(rdb(h, f'body.{i}.rdb1'), f'body.{i}.rdb2'), f'body.{i}.rdb3')
        h = add(mul(o, 0.2), h)
    feat = add(feat, conv(h, 'conv_body'))
    feat = lrelu(conv(up2(feat), 'conv_up1'))
    feat = lrelu(conv(up2(feat), 'conv_up2'))
    out = conv(lrelu(conv(feat, 'conv_hr')), 'conv_last')
    nodes.append(helper.make_node('Identity', [out], ['output']))
    g = helper.make_graph(nodes, 'rrdbnet_x4',
                          [helper.make_tensor_value_info('input', TensorProto.FLOAT, [1, 3, None, None])],
                          [helper.make_tensor_value_info('output', TensorProto.FLOAT, [1, 3, None, None])], inits)
    m = helper.make_model(g, opset_imports=[helper.make_opsetid('', 17)])
    m.ir_version = 8
    return m


# ---------------------------------------------------------------- Kachelweise rechnen
def run(weights, src, dst, tile=192, pad=16):
    import onnxruntime as ort
    from PIL import Image
    sd = load_state(weights)
    print('Gewichte:', len(sd), 'Tensoren')
    model = build_model(sd)
    so = ort.SessionOptions()
    so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    sess = ort.InferenceSession(model.SerializeToString(), so, providers=['CPUExecutionProvider'])
    img = np.asarray(Image.open(src).convert('RGB')).astype(np.float32) / 255.0
    H, W, _ = img.shape
    S = 4
    out = np.zeros((H * S, W * S, 3), np.float32)
    ys = list(range(0, H, tile)); xs = list(range(0, W, tile))
    t0 = time.time(); n = 0
    for y0 in ys:
        for x0 in xs:
            y1, x1 = min(y0 + tile, H), min(x0 + tile, W)
            py0, px0 = max(y0 - pad, 0), max(x0 - pad, 0)
            py1, px1 = min(y1 + pad, H), min(x1 + pad, W)
            patch = img[py0:py1, px0:px1].transpose(2, 0, 1)[None]
            res = sess.run(['output'], {'input': np.ascontiguousarray(patch)})[0][0].transpose(1, 2, 0)
            oy, ox = (y0 - py0) * S, (x0 - px0) * S
            out[y0 * S:y1 * S, x0 * S:x1 * S] = res[oy:oy + (y1 - y0) * S, ox:ox + (x1 - x0) * S]
            n += 1
            print(f'Kachel {n}/{len(ys) * len(xs)}  {time.time() - t0:.0f}s', flush=True)
    out = (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)
    Image.fromarray(out).save(dst)
    print('fertig', dst, out.shape, f'{time.time() - t0:.0f}s')


if __name__ == '__main__':
    a = sys.argv[1:]
    run(a[0], a[1], a[2], int(a[3]) if len(a) > 3 else 192, int(a[4]) if len(a) > 4 else 16)
