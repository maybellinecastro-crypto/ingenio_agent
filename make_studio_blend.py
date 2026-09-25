import bpy
import math

SOURCE = r"C:\Users\MAYBELLINE\Documents\ChatGPT\agente\ingenio_robot.blend"
OUTPUT = r"C:\Users\MAYBELLINE\Documents\ChatGPT\agente\ingenio_estudio_tecnico.blend"
PREVIEW = r"C:\Users\MAYBELLINE\Documents\ChatGPT\agente\ingenio_estudio_tecnico_3d.png"

bpy.ops.wm.open_mainfile(filepath=SOURCE)

def mat(name, rgba, rough=0.45, emission=None, strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = rgba
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = rgba
    bs.inputs['Roughness'].default_value = rough
    if emission:
        bs.inputs['Emission Color'].default_value = emission
        bs.inputs['Emission Strength'].default_value = strength
    return m

BG = mat('Studio Light Gray', (0.72, 0.75, 0.77, 1), 0.6)
GRID = mat('Technical Grid', (0.28, 0.34, 0.38, 1), 0.7)
LABEL = mat('Caption White', (0.95, 0.97, 1.0, 1), 0.35)
LABEL_BG = mat('Caption Graphite', (0.035, 0.045, 0.055, 1), 0.5)

# Replace the dark floor with a bright neutral studio floor.
floor = bpy.data.objects.get('Display Floor')
if floor:
    floor.data.materials.clear()
    floor.data.materials.append(BG)

# Technical backdrop behind the robot.
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 3.4, 5.0), rotation=(math.pi/2, 0, 0))
back = bpy.context.object
back.name = 'Technical Studio Backdrop'
back.data.materials.append(BG)

def bar(name, loc, scale):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(GRID)
    return o

# Fine engineering grid geometry, positioned just in front of the backdrop.
for i in range(-12, 13):
    x = i * 0.5
    bar(f'Grid V {i:+03d}', (x, 3.30, 5.0), (0.006 if i % 2 else 0.012, 0.008, 5.8))
for i in range(0, 22):
    z = i * 0.5
    bar(f'Grid H {i:02d}', (0, 3.30, z), (6.2, 0.008, 0.006 if i % 2 else 0.012))

# A few blueprint-style guide rings.
for x, z, radius in [(-3.7, 7.4, 0.8), (3.8, 2.0, 0.55), (3.7, 7.2, 0.45)]:
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=0.012, major_segments=64,
                                    minor_segments=8, location=(x, 3.18, z), rotation=(math.pi/2, 0, 0))
    bpy.context.object.name = 'Blueprint Guide Ring'
    bpy.context.object.data.materials.append(GRID)

# Compact lower-left caption plaque.
bar('Caption Plaque', (-3.55, -0.55, 0.13), (1.65, 0.40, 0.12))
bpy.context.object.data.materials.clear()
bpy.context.object.data.materials.append(LABEL_BG)

bpy.ops.object.text_add(location=(-5.02, -0.98, 0.17), rotation=(math.pi/2, 0, 0))
txt = bpy.context.object
txt.name = 'AGENTE VIRTUAL INGENIO'
txt.data.body = 'AGENTE VIRTUAL INGENIO'
txt.data.align_x = 'LEFT'
txt.data.align_y = 'CENTER'
txt.data.size = 0.32
txt.data.extrude = 0.008
txt.data.bevel_depth = 0.004
txt.data.materials.append(LABEL)

# Bright, uniform neutral studio lighting.
for obj in list(bpy.data.objects):
    if obj.type == 'LIGHT':
        bpy.data.objects.remove(obj, do_unlink=True)

def area(name, loc, energy, size, color):
    bpy.ops.object.light_add(type='AREA', location=loc)
    o = bpy.context.object
    o.name = name
    o.data.energy = energy
    o.data.shape = 'DISK'
    o.data.size = size
    o.data.color = color
    direction = bpy.context.scene.camera.location * 0
    target = (0, 0, 4)
    from mathutils import Vector
    o.rotation_euler = (Vector(target) - o.location).to_track_quat('-Z', 'Y').to_euler()

area('Studio Key', (-5, -7, 10), 1700, 5.0, (1.0, 0.96, 0.92))
area('Studio Fill', (5, -5, 8), 1350, 4.5, (0.90, 0.96, 1.0))
area('Studio Top', (0, 1, 12), 1500, 4.0, (1.0, 1.0, 1.0))

world = bpy.context.scene.world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.65, 0.68, 0.72, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.65

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 720
scene.render.resolution_y = 900
scene.render.resolution_percentage = 75
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = PREVIEW
scene.view_settings.look = 'AgX - Medium High Contrast'

bpy.ops.wm.save_as_mainfile(filepath=OUTPUT)
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT)
print('STUDIO_BLEND_CREATED', OUTPUT)
print('STUDIO_PREVIEW_CREATED', PREVIEW)
