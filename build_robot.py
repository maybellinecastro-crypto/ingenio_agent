import bpy
import math
from mathutils import Vector

OUT = r"C:\Users\MAYBELLINE\Documents\ChatGPT\agente\ingenio_robot.blend"
PREVIEW = r"C:\Users\MAYBELLINE\Documents\ChatGPT\agente\ingenio_robot_preview.png"

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.curves, bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    pass

def material(name, color, metallic=0.0, rough=0.35, emission=None, strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metallic
    bs.inputs['Roughness'].default_value = rough
    if emission:
        bs.inputs['Emission Color'].default_value = (*emission, 1)
        bs.inputs['Emission Strength'].default_value = strength
    return m

WHITE = material('Ceramic White', (0.82, 0.88, 0.92), 0.5, 0.2)
BLACK = material('Visor Black', (0.004, 0.008, 0.012), 0.65, 0.13)
DARK = material('Joint Graphite', (0.025, 0.035, 0.045), 0.8, 0.25)
ORANGE = material('Orange Glow', (1.0, 0.22, 0.005), 0.25, 0.2, (1.0, 0.08, 0.0), 10.0)
GREEN = material('Lime Accent', (0.14, 0.75, 0.025), 0.25, 0.25, (0.03, 0.25, 0.0), 1.2)
FLOOR = material('Floor', (0.005, 0.035, 0.045), 0.1, 0.45)

def smooth(obj, bevel=0.0):
    if obj.type == 'MESH':
        for p in obj.data.polygons:
            p.use_smooth = True
        if bevel:
            mod = obj.modifiers.new('Soft bevel', 'BEVEL')
            mod.width = bevel
            mod.segments = 3
    return obj

def uv(name, loc, scale, mat, seg=48, rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    o = bpy.context.object; o.name = name; o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat); smooth(o)
    return o

def cube(name, loc, scale, mat, bevel=0.18, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat); smooth(o, bevel)
    return o

def cyl(name, a, b, radius, mat, verts=36):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=d.length, location=(a+b)/2)
    o=bpy.context.object; o.name=name; o.data.materials.append(mat)
    o.rotation_mode='QUATERNION'; o.rotation_quaternion=d.to_track_quat('Z','Y'); smooth(o, 0.05)
    return o

def torus(name, loc, major, minor, mat, rot=(math.pi/2,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=48, minor_segments=12, location=loc, rotation=rot)
    o=bpy.context.object; o.name=name; o.data.materials.append(mat); smooth(o)
    return o

def curve(name, pts, radius, mat, cyclic=False):
    cu=bpy.data.curves.new(name,'CURVE'); cu.dimensions='3D'; cu.bevel_depth=radius; cu.bevel_resolution=4
    sp=cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts)-1)
    for bp,co in zip(sp.bezier_points,pts):
        bp.co=co; bp.handle_left_type='AUTO'; bp.handle_right_type='AUTO'
    sp.use_cyclic_u=cyclic
    o=bpy.data.objects.new(name,cu); bpy.context.collection.objects.link(o); o.data.materials.append(mat)
    return o

def disk(name, loc, radius, depth, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=radius, depth=depth, location=loc, rotation=(math.pi/2,0,0))
    o=bpy.context.object; o.name=name; o.data.materials.append(mat); smooth(o,0.04); return o

def eye_arc(cx, cz, flip=1):
    pts=[]
    for i in range(9):
        t=math.pi*0.15 + i*(math.pi*0.7/8)
        pts.append((cx+0.30*math.cos(t), -1.035, cz+flip*0.22*math.sin(t)))
    return pts

# Ground and backdrop
bpy.ops.mesh.primitive_plane_add(size=30, location=(0,0,0))
bpy.context.object.name='Display Floor'; bpy.context.object.data.materials.append(FLOOR)

# Legs: feet, shins, knees and thighs
for x in (-0.70,0.70):
    cube('Foot shell', (x,-0.22,0.38), (0.58,0.92,0.30), WHITE, 0.24)
    cube('Toe graphite', (x,-0.92,0.35), (0.50,0.23,0.19), DARK, 0.12)
    cube('Toe stripe', (x,-1.12,0.37), (0.35,0.05,0.07), GREEN, 0.04)
    uv('Ankle joint', (x,0.02,0.78), (0.34,0.30,0.27), DARK)
    torus('Ankle glow ring',(x,-0.285,0.78),0.17,0.045,ORANGE)
    uv('Shin armor', (x,0.04,1.40), (0.50,0.43,0.70), WHITE)
    cube('Shin inset', (x,-0.41,1.38), (0.22,0.05,0.35), DARK,0.08)
    curve('Shin glow',[(x-0.20,-0.47,1.18),(x,-0.49,1.10),(x+0.20,-0.47,1.18)],0.035,ORANGE)
    uv('Knee joint',(x,0.02,2.08),(0.38,0.34,0.36),DARK)
    torus('Knee glow ring',(x,-0.33,2.08),0.19,0.05,ORANGE)
    uv('Thigh armor',(x,0.10,2.80),(0.62,0.52,0.84),WHITE)
    cube('Thigh black inset',(x,-0.48,2.76),(0.26,0.06,0.40),DARK,0.10)
    curve('Green thigh trim',[(x-0.42,-0.36,2.50),(x-0.49,-0.25,2.78),(x-0.40,-0.30,3.06)],0.045,GREEN)

# Pelvis and torso
uv('Hip core',(0,0.10,3.43),(1.05,0.60,0.58),DARK)
cube('Pelvis armor',(0,-0.28,3.52),(0.92,0.48,0.48),WHITE,0.28)
cube('Pelvis center',(0,-0.78,3.55),(0.38,0.06,0.22),DARK,0.08)
uv('Torso shell',(0,0.0,4.42),(1.25,0.72,1.10),WHITE)
uv('Torso waist',(0,0.05,3.78),(0.73,0.55,0.55),DARK)
cube('Abdominal plate',(0,-0.61,3.95),(0.55,0.12,0.40),WHITE,0.15)
curve('Ab glow', [(-0.30,-0.76,4.10),(0,-0.80,3.96),(0.30,-0.76,4.10)],0.035,ORANGE)

# Chest emblem
disk('Chest badge',(0,-0.735,4.55),0.43,0.10,BLACK)
torus('Chest badge rim',(0,-0.80,4.55),0.38,0.035,ORANGE)
curve('Circuit line',[(-0.18,-0.865,4.35),(-0.08,-0.875,4.55),(0.08,-0.875,4.68),(0.19,-0.865,4.82)],0.035,ORANGE)
for p in [(-0.18,-0.87,4.35),(-0.07,-0.88,4.66),(0.19,-0.87,4.82)]:
    uv('Circuit node',p,(0.065,0.03,0.065),ORANGE,24,12)

# Neck and head
uv('Neck',(0,0.02,5.40),(0.43,0.39,0.30),DARK)
torus('Neck glow',(0,-0.37,5.41),0.25,0.045,ORANGE)
cube('Head shell',(0,0.0,6.25),(1.28,0.88,0.88),WHITE,0.38)
cube('Top cap',(0,0.08,7.05),(0.72,0.72,0.18),DARK,0.16)
cube('Visor',(0,-0.84,6.22),(1.08,0.13,0.61),BLACK,0.30)
curve('Left happy eye', eye_arc(-0.46,6.30,1),0.065,ORANGE)
curve('Right happy eye', eye_arc(0.46,6.30,1),0.065,ORANGE)
curve('Smile',[(-0.31,-1.025,5.99),(0,-1.045,5.86),(0.31,-1.025,5.99)],0.055,ORANGE)
for x in (-1.30,1.30):
    uv('Ear pod',(x*0.93,0.0,6.30),(0.26,0.38,0.45),DARK)
    torus('Ear glow',(x*0.93,-0.35,6.30),0.19,0.045,ORANGE)
curve('Antenna',[(-0.95,0.0,6.62),(-1.12,0.0,7.25),(-1.08,0.0,7.78)],0.055,ORANGE)
uv('Antenna tip',(-1.08,0.0,7.79),(0.09,0.09,0.12),ORANGE,24,12)
curve('Green crown trim',[(-0.58,-0.73,6.99),(0,-0.82,7.09),(0.58,-0.73,6.99)],0.045,GREEN)

# Arms, asymmetrical friendly pose
def arm(side, shoulder, elbow, wrist, hand, raised=False):
    sx=side
    uv('Shoulder joint',shoulder,(0.46,0.45,0.46),DARK)
    torus('Shoulder ring',(shoulder[0],shoulder[1]-0.43,shoulder[2]),0.25,0.045,ORANGE)
    # upper and forearm armor as capsules
    mid1=(Vector(shoulder)+Vector(elbow))/2
    cyl('Upper arm',shoulder,elbow,0.39,WHITE)
    uv('Elbow joint',elbow,(0.34,0.34,0.34),DARK)
    torus('Elbow ring',(elbow[0],elbow[1]-0.34,elbow[2]),0.18,0.045,ORANGE)
    cyl('Forearm',elbow,wrist,0.34,WHITE)
    curve('Arm green trim',[(mid1.x-0.10*sx,mid1.y-0.38,mid1.z-0.18),(mid1.x,mid1.y-0.42,mid1.z),(mid1.x+0.10*sx,mid1.y-0.38,mid1.z+0.18)],0.045,GREEN)
    uv('Wrist joint',wrist,(0.27,0.27,0.27),DARK)
    uv('Palm',hand,(0.36,0.22,0.43),WHITE)
    torus('Palm light',(hand[0],hand[1]-0.23,hand[2]),0.15,0.04,ORANGE)
    return Vector(hand)

# Raised arm on viewer left
h=arm(-1,(-1.18,0.0,4.82),(-1.82,-0.02,4.55),(-2.18,-0.02,5.33),(-2.22,-0.03,5.82),True)
# five articulated fingers rising/spreading
finger_specs=[(-0.33,0.02,0.18,0.15),(-0.20,0.02,0.35,0.24),(-0.07,0.02,0.40,0.28),(0.08,0.02,0.36,0.25),(0.32,0.02,0.16,0.12)]
for i,(dx,dy,dz,slant) in enumerate(finger_specs):
    a=h+Vector((dx,dy,0.25 if i<4 else 0.02))
    b=a+Vector((-slant if i<2 else slant*0.45,0,dz+0.25))
    c=b+Vector((-slant*0.35 if i<2 else slant*0.25,0,0.27))
    cyl('Finger base',a,b,0.075,DARK,20); cyl('Finger tip',b,c,0.065,DARK,20)
    uv('Finger glow',b,(0.085,0.065,0.085),ORANGE,20,10)

# Relaxed arm on viewer right
h2=arm(1,(1.18,0.0,4.82),(1.65,-0.05,4.05),(1.94,-0.10,3.35),(2.00,-0.12,3.03),False)
for i,dx in enumerate((-0.22,-0.08,0.08,0.22)):
    a=h2+Vector((dx,0,-0.23)); b=a+Vector((dx*0.25,-0.02,-0.38))
    cyl('Relaxed finger',a,b,0.065,DARK,20)
    if i in (0,3): uv('Finger accent',b,(0.07,0.055,0.07),ORANGE,20,10)

# Accent shoulder fins
for x in (-1.03,1.03):
    curve('Shoulder lime',[(x,-0.58,4.55),(x*1.18,-0.52,4.82),(x*1.08,-0.48,5.05)],0.055,GREEN)

# Camera and lighting
def look_at(obj, target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

bpy.ops.object.camera_add(location=(10.0,-16.0,8.0))
cam=bpy.context.object; cam.name='Hero Camera'; look_at(cam,(0,-0.1,3.8)); cam.data.lens=62
bpy.context.scene.camera=cam

bpy.ops.object.light_add(type='AREA', location=(-5,-7,10))
key=bpy.context.object; key.name='Key'; key.data.energy=1400; key.data.shape='DISK'; key.data.size=5; look_at(key,(0,0,4))
bpy.ops.object.light_add(type='AREA', location=(5,-3,7))
fill=bpy.context.object; fill.name='Fill'; fill.data.energy=900; fill.data.color=(0.20,0.65,1.0); fill.data.size=4; look_at(fill,(0,0,4))
bpy.ops.object.light_add(type='AREA', location=(0,4,9))
rim=bpy.context.object; rim.name='Rim'; rim.data.energy=1200; rim.data.color=(0.25,1.0,0.35); rim.data.size=3; look_at(rim,(0,0,4.5))

world=bpy.context.scene.world
world.color=(0.003,0.012,0.018)
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(0.003,0.018,0.025,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=0.32

scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=720; scene.render.resolution_y=900; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.filepath=PREVIEW
scene.render.film_transparent=False
scene.render.image_settings.color_mode='RGBA'
scene.view_settings.look='AgX - Medium High Contrast'
scene.render.resolution_percentage=75

# Organize and save
bpy.ops.wm.save_as_mainfile(filepath=OUT)
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print('ROBOT_BLEND_CREATED', OUT)
print('ROBOT_PREVIEW_CREATED', PREVIEW)
