"""Exporta de Z-Anatomy un GLB con los músculos superficiales agrupados en los 13 grupos de Carga.
Uso: blender -b Startup.blend --python exportar_glb.py -- salida.glb
"""
import bpy, re, sys, bmesh

salida = sys.argv[sys.argv.index('--') + 1]

# nombre base (sin .l/.r) -> grupo
GRUPOS = {
    'pecho': ['Clavicular head of pectoralis major muscle', 'Sternocostal head of pectoralis major muscle', '(Abdominal part of pectoralis major muscle)'],
    'deltAnt': ['Clavicular part of deltoid muscle'],
    'deltLat': ['Acromial part of deltoid muscle'],
    'deltPost': ['Scapular spinal part of deltoid muscle'],
    'biceps': ['Long head of biceps brachii', 'Short head of biceps brachii', 'Brachialis muscle', 'Coracobrachialis muscle'],
    'triceps': ['Long head of triceps brachii', 'Lateral head of triceps brachii', 'Medial head of triceps brachii', 'Anconeus muscle'],
    'antebrazo': ['Brachioradialis muscle', 'Extensor carpi radialis longus', 'Extensor carpi radialis brevis', 'Extensor digitorum', 'Extensor digiti minimi',
                  'Humeral head of extensor carpi ulnaris', 'Ulnar head of extensor carpi ulnaris', 'Flexor carpi radialis', 'Palmaris longus muscle',
                  'Humeral head of flexor carpi ulnaris', 'Ulnar head of flexor carpi ulnaris', 'Superficial head of pronator teres', 'Deep head of pronator teres',
                  'Abductor pollicis longus', 'Extensor pollicis brevis', 'Extensor pollicis longus', 'Humero-ulnar head of flexor digitorum superficialis',
                  'Radial head of flexor digitorum superficialis', 'Flexor digitorum profundus', 'Flexor pollicis longus', 'Extensor indicis', 'Supinator', 'Pronator quadratus'],
    'espalda': ['Latissimus dorsi muscle', 'Descending part of trapezius muscle', 'Transverse part of trapezius muscle', 'Ascending part of trapezius muscle',
                'Rhomboid major muscle', 'Rhomboid minor muscle', 'Teres major muscle', 'Teres minor muscle', 'Infraspatus muscle', 'Infraspinatus muscle',
                'Iliocostalis lumborum muscle', 'Iliocostalis thoracis muscle', 'Longissimus thoracis muscle', 'Spinalis thoracis muscle', 'Levator scapulae',
                'Serratus posterior inferior muscle', 'Posterior layer of thoracolumbar fascia'],
    'abs': ['Rectus abdominis muscle', 'External abdominal oblique muscle', 'Pyramidalis muscle', 'Serratus anterior muscle'],
    'gluteos': ['Gluteus maximus muscle', 'Gluteus medius muscle', 'Tensor fasciae latae'],
    'cuads': ['Rectus femoris muscle', 'Vastus lateralis muscle', 'Vastus medialis muscle', 'Vastus intermedius muscle'],
    'isquios': ['Long head of biceps femoris', 'Short head of biceps femoris', 'Semimembranosus muscle', 'Semitendinosus muscle'],
    'gemelos': ['Medial head of gastrocnemius', 'Lateral head of gastrocnemius', 'Soleus muscle', 'Calcaneal tendon'],
    # relleno neutro: completa la silueta sin color
    'neutro': ['Sternocleidomastoid muscle', 'Sartorius muscle', 'Adductor longus', 'Adductor magnus', 'Adductor brevis', 'Gracilis muscle', 'Pectineus muscle',
               'Iliotibial tract', 'Tibialis anterior muscle', 'Fibularis longus muscle', 'Fibularis brevis muscle', 'Extensor digitorum longus', 'Extensor hallucis longus',
               'Scalenus anterior muscle', 'Scalenus medius muscle', 'Scalenus posterior muscle', 'Splenius capitis muscle', 'Omohyoid muscle', 'Sternohyoid muscle',
               'Superficial part of masseter', 'Temporalis muscle', 'Frontalis muscle', 'Occipitalis muscle', 'Epicranial aponeurosis', 'Orbital part of orbicularis oculi',
               'Orbicularis oris muscle', 'Zygomaticus major muscle', 'Levator labii superioris', 'Depressor anguli oris', 'Mentalis muscle', 'Nasalis muscle', 'Bucinator',
               'Platysma', 'Abductor pollicis brevis', 'Opponens pollicis muscle', 'Abductor digiti minimi of hand', 'Dorsal interossei muscles of hand', 'Lumbrical muscles of hand',
               'Palmar aponeurosis', 'Extensor digitorum brevis', 'Abductor hallucis', 'Abductor digiti minimi of foot', 'Flexor digitorum brevis', 'Plantar aponeurosis',
               'Extensor retinaculum of wrist', 'Flexor retinaculum of wrist', 'Superior extensor retinaculum of ankle', 'Inferior extensor retinaculum of ankle',
               'Linea alba', 'Inguinal ligament', 'Flexor hallucis longus', 'Tibialis posterior muscle', 'Quadratus lumborum muscle'],
}
# huesos que asoman (cabeza, manos, pies): completan la figura
HUESOS = re.compile(r'(Frontal bone|Parietal bone|Occipital bone|Temporal bone|Zygomatic bone|Maxilla|Mandible|Nasal bone|Sphenoid bone|Ethmoid|Lacrimal|Palatine bone|Vomer|'
                    r'metacarpal|phalanx|Scaphoid|Lunate|Triquetrum|Pisiform|Trapezium|Trapezoid|Capitate|Hamate|'
                    r'metatarsal|Calcaneus|Talus|Navicular|Cuboid|cuneiform|Patella|Clavicle|Sternum|Hyoid|Tooth|teeth)', re.I)

def base(nombre):
    return re.sub(r'\.(l|r|g|j)(\.\d+)?$', '', nombre)

grupo_de = {}
for g, lista in GRUPOS.items():
    for n in lista:
        grupo_de[n] = g

# recolectar
scene = bpy.context.scene
musc = bpy.data.collections.get('4: Muscular system')
esq = bpy.data.collections.get('1: Skeletal system')
seleccion = {g: [] for g in list(GRUPOS) + ['hueso']}
def todos(col):
    for o in col.all_objects:
        yield o
for o in todos(musc):
    if o.type != 'MESH' or not o.data: continue
    if re.search(r'\.(g|j)$', o.name): continue
    g = grupo_de.get(base(o.name))
    if g: seleccion[g].append(o)
for o in todos(esq):
    if o.type != 'MESH' or not o.data: continue
    if re.search(r'\.(g|j)$', o.name): continue
    if HUESOS.search(o.name): seleccion['hueso'].append(o)

faltan = [n for n in grupo_de if not any(base(o.name) == n for g in seleccion for o in seleccion[g])]
print('no encontrados:', faltan)

# hacer visibles y aplicar
for o in bpy.data.objects:
    o.hide_set(False); o.hide_viewport = False; o.hide_select = False

PRESUPUESTO = {'hueso': 18000, 'neutro': 22000, 'antebrazo': 8000, 'abs': 8000}
tris_total = 0
nuevos = []
for g, objs in seleccion.items():
    if not objs: continue
    bpy.ops.object.select_all(action='DESELECT')
    copias = []
    for o in objs:
        c = o.copy(); c.data = o.data.copy(); c.animation_data_clear()
        scene.collection.objects.link(c)
        c.select_set(True); copias.append(c)
    bpy.context.view_layer.objects.active = copias[0]
    for c in copias:
        c.modifiers.clear()
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(copias) > 1:
        bpy.ops.object.join()
    m = bpy.context.view_layer.objects.active
    m.name = f'grupo_{g}'
    m.data.name = f'grupo_{g}'
    m.data.materials.clear()
    tris = sum(len(p.vertices) - 2 for p in m.data.polygons)
    objetivo = PRESUPUESTO.get(g, 9000)
    if tris > objetivo:
        mod = m.modifiers.new('dec', 'DECIMATE'); mod.ratio = objetivo / tris; mod.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier='dec')
    bpy.ops.object.shade_smooth()
    tris2 = sum(len(p.vertices) - 2 for p in m.data.polygons)
    tris_total += tris2
    print(g, len(objs), 'objetos', tris, '->', tris2, 'tris')
    nuevos.append(m)

bpy.ops.object.select_all(action='DESELECT')
for m in nuevos: m.select_set(True)
print('tris total', tris_total)
bpy.ops.export_scene.gltf(filepath=salida, export_format='GLB', use_selection=True, export_apply=True, export_materials='NONE',
                          export_normals=True, export_texcoords=False, export_yup=True, export_animations=False, export_skins=False)
print('exportado', salida)
