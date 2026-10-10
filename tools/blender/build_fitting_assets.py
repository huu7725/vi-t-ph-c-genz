"""Generate original, smooth adult fitting mannequins and compatible GLB outfits.
Blender 4.5, metres, Blender Z-up/-Y forward -> glTF Y-up/+Z forward.
No third-party asset extraction. Run using Blender --background --python or bpy.
"""
import bpy
import bmesh
import math
import json
from pathlib import Path
from mathutils import Vector
from ao_dai_helper_bones import ensure_flap_helpers

OUT = Path(__file__).resolve().parents[2] / 'frontend/public/models/fitting'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
MANIFEST = {'version': 1, 'generator': 'Original Blender fitting mannequin v1', 'profiles': {}}

def point(x, y, z=0):
    return Vector((x, -z, y))

def material(name, color, rough=.55, sheen=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*color,1)
    bsdf.inputs['Roughness'].default_value=rough
    bsdf.inputs['Sheen Weight'].default_value=sheen
    return m

def mesh(name,vertices,faces,mat,uvs=None):
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for poly in data.polygons:poly.use_smooth=True
    if uvs:
        layer=data.uv_layers.new(name='UVMap')
        for poly in data.polygons:
            for li in poly.loop_indices:layer.data[li].uv=uvs[data.loops[li].vertex_index]
    return obj

def ring_surface(name, sections, mat, angle=(-math.pi,math.pi), rows=40,cols=48,fold=.0):
    # Sections sorted from crown/neck towards ankles; linear profile densely sampled.
    def radius(y):
        for a,b in zip(sections,sections[1:]):
            if a[0]>=y>=b[0]:
                t=(a[0]-y)/(a[0]-b[0]);s=t*t*(3-2*t)
                return a[1]+(b[1]-a[1])*s,a[2]+(b[2]-a[2])*s
        return sections[-1][1],sections[-1][2]
    verts=[];faces=[];uv=[]
    for r in range(rows+1):
        t=r/rows;y=sections[0][0]+(sections[-1][0]-sections[0][0])*t;rx,rz=radius(y)
        for c in range(cols+1):
            a=angle[0]+(angle[1]-angle[0])*c/cols;f=fold*math.cos(a*10)*t*t
            verts.append(point(math.sin(a)*(rx+f),y,math.cos(a)*(rz+f)));uv.append((c/cols,1-t))
            if r<rows and c<cols:
                i=r*(cols+1)+c;j=i+cols+1;faces.append((i,j,j+1,i+1))
    return mesh(name,verts,faces,mat,uv)

def tube(name, points, radii, mat, rows=28, cols=24):
    points=[Vector(p) for p in points];verts=[];faces=[];uv=[]
    for r in range(rows+1):
        t=r/rows;f=t*(len(points)-1);i=min(int(f),len(points)-2);u=f-i
        p=points[i].lerp(points[i+1],u);tangent=(points[i+1]-points[i]).normalized()
        normal=Vector((0,1,0)).cross(tangent).normalized();binormal=tangent.cross(normal).normalized()
        rad=radii[i]+(radii[i+1]-radii[i])*u
        for c in range(cols+1):
            a=c/cols*math.tau;verts.append(p+normal*math.cos(a)*rad+binormal*math.sin(a)*rad*.88);uv.append((c/cols,1-t))
            if r<rows and c<cols:
                k=r*(cols+1)+c;j=k+cols+1;faces.append((k,j,j+1,k+1))
    # End caps are needed for the voxel union of body parts.
    faces.append(tuple(reversed(range(cols+1))))
    start=rows*(cols+1);faces.append(tuple(start+c for c in range(cols+1)))
    return mesh(name,verts,faces,mat,uv)

def sphere(name,p,size,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=24,location=p)
    obj=bpy.context.object;obj.name=name;obj.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(mat)
    for f in obj.data.polygons:f.use_smooth=True
    return obj

def join(objects,name):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    obj=bpy.context.object;obj.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    return obj

def rig(gender, shoulder):
    data=bpy.data.armatures.new('FittingRig');obj=bpy.data.objects.new('FittingRig',data)
    bpy.context.collection.objects.link(obj);obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(name,head,tail,parent=None):
        b=data.edit_bones.new(name);b.head=head;b.tail=tail;b.use_deform=True
        if parent:b.parent=data.edit_bones[parent]
    bone('Hips',point(0,.93),point(0,1.04))
    bone('Spine',point(0,1.04),point(0,1.24),'Hips')
    bone('Chest',point(0,1.24),point(0,1.43),'Spine')
    bone('Neck',point(0,1.43),point(0,1.55),'Chest')
    bone('Head',point(0,1.55),point(0,1.77),'Neck')
    joints={}
    for sign,side in [(-1,'L'),(1,'R')]:
        sh=point(sign*shoulder,1.408);el=point(sign*(shoulder+.19),1.213,.008);wr=point(sign*(shoulder+.371),1.018,.026)
        hand=wr+point(sign*.096,-.086,.004)
        bone('UpperArm.'+side,sh,el,'Chest');bone('LowerArm.'+side,el,wr,'UpperArm.'+side);bone('Hand.'+side,wr,hand,'LowerArm.'+side)
        hip=point(sign*.087,.92);knee=point(sign*.091,.505);ankle=point(sign*.095,.085)
        bone('UpperLeg.'+side,hip,knee,'Hips');bone('LowerLeg.'+side,knee,ankle,'UpperLeg.'+side);bone('Foot.'+side,ankle,point(sign*.095,.045,.18),'LowerLeg.'+side)
        joints[side]=(sh,el,wr)
    bpy.ops.object.mode_set(mode='OBJECT');ensure_flap_helpers()
    return obj,joints

def weight(obj,arm,region=None,flap=None):
    groups={b.name:obj.vertex_groups.new(name=b.name) for b in arm.data.bones if b.use_deform}
    bones=[b for b in arm.data.bones if b.use_deform and not b.name.startswith('Flap_')]
    def distance(p,b):
        a=b.head_local;c=b.tail_local;direction=c-a;t=max(0,min(1,(p-a).dot(direction)/direction.length_squared))
        return (p-(a+direction*t)).length
    for v in obj.data.vertices:
        p=obj.matrix_world@v.co;y=p.z
        if flap and y<1.105:
            f=max(0,min(3.999,(1.105-y)/(1.105-.085)*4));i=int(f)+1
            first='Flap_'+flap+f'_{i:02d}';second='Flap_'+flap+f'_{min(i+1,4):02d}'
            w=f-int(f);groups[first].add([v.index],1-w,'REPLACE')
            if second!=first:groups[second].add([v.index],w,'REPLACE')
            continue
        eligible=bones
        if region=='head':eligible=[b for b in bones if b.name in ('Head','Neck')]
        elif region in ('legs','feet') or y<.91:eligible=[b for b in bones if 'Leg.' in b.name or b.name=='Hips' or 'Foot.' in b.name]
        elif abs(p.x)>.165 and y>1.0:eligible=[b for b in bones if 'Arm.' in b.name or 'Hand.' in b.name or b.name=='Chest']
        else:eligible=[b for b in bones if b.name in ('Hips','Spine','Chest','Neck','Head')]
        nearest=sorted(eligible,key=lambda b:distance(p,b))[:3]
        weights=[1/(distance(p,b)+.025)**4 for b in nearest];total=sum(weights)
        for b,w in zip(nearest,weights):groups[b.name].add([v.index],w/total,'REPLACE')
    mod=obj.modifiers.new('Common skeleton','ARMATURE');mod.object=arm;obj.parent=arm

def export(path,objects,arm):
    bpy.ops.object.select_all(action='DESELECT');arm.select_set(True)
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=arm
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,
        export_animations=False,export_apply=False,export_skins=True,export_all_influences=False,
        export_def_bones=False,export_materials='EXPORT',export_yup=True)

for gender in ['nu','nam']:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    male=gender=='nam';shoulder=.192 if male else .169
    skin=material('Mannequin_Skin',(.59,.43,.31),.58)
    cloth=material('Fabric_Main',(1,1,1),.50,.40)
    pattern=material('Fabric_Pattern',(1,1,1),.50,.40)
    trim=material('Fabric_Trim',(1,1,1),.5,.3)
    arm,joints=rig(gender,shoulder)
    parts=[]
    torso=[(1.44,.13,.073),(1.34,.172 if male else .150,.100),(1.26,.169 if male else .156,.098),
        (1.10,.139 if male else .119,.076),(.96,.160 if male else .176,.101),(.84,.145 if male else .165,.094)]
    parts.append(ring_surface('Torso',torso,skin,rows=48))
    parts.append(tube('Neck',[point(0,1.40),point(0,1.57)],[.046 if male else .039,.043 if male else .036],skin))
    # Head has an oval taper and a subtle projected nose, not a faceted primitive.
    head=ring_surface('Head',[(1.782,.001,.001),(1.766,.043,.040),(1.72,.070,.070),(1.65,.076 if male else .069,.078),
        (1.60,.067 if male else .061,.069),(1.55,.039,.045),(1.54,.020,.027)],skin,rows=60,cols=64)
    for v in head.data.vertices:
        x,z,y=v.co.x,-v.co.y,v.co.z
        if z>0:
            projection=.014*math.exp(-((x/.013)**2+((y-1.635)/.023)**2))+.017*math.exp(-((x/.015)**2+((y-1.614)/.013)**2))
            v.co.y-=projection
    parts.append(head)
    for sign in [-1,1]:parts.append(sphere('Ear',point(sign*.073,1.63),(.012,.014,.025),skin))
    for side,(sh,el,wr) in joints.items():
        sign=-1 if side=='L' else 1
        parts.append(tube('Arm',[sh,el,wr],[.048 if male else .039,.030,.022],skin))
        handEnd=wr+point(sign*.066,-.057,.003)
        parts.append(tube('Palm',[wr,handEnd],[.024,.028],skin,rows=12,cols=16))
        axis=(wr-el).normalized();cross=Vector((0,1,0)).cross(axis).normalized()
        for index,length in enumerate([.064,.077,.072,.055]):
            start=handEnd+cross*((index-1.5)*.012);end=start+axis*length
            parts.append(tube('Finger',[start,end],[.006,.0045],skin,rows=8,cols=10))
        thumb=wr.lerp(handEnd,.55)+cross*.027
        parts.append(tube('Thumb',[thumb,thumb+axis*.043+cross*.019],[.008,.0055],skin,rows=8,cols=12))
        parts.append(tube('Leg',[point(sign*.087,.925),point(sign*.091,.52),point(sign*.095,.085)],
            [.081 if male else .085,.040,.026],skin,rows=44))
        parts.append(sphere('Foot',point(sign*.095,.045,.085),(.040,.123,.035),skin))
    body=join(parts,'AdultBody')
    remesh=body.modifiers.new('Continuous anatomy','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.006;remesh.use_smooth_shade=True
    bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth=body.modifiers.new('Soft silhouette','SMOOTH');smooth.factor=.50;smooth.iterations=4;bpy.ops.object.modifier_apply(modifier=smooth.name)
    triangles=sum(len(poly.vertices)-2 for poly in body.data.polygons)
    decimate=body.modifiers.new('Game topology','DECIMATE');decimate.ratio=min(1,40000/max(1,triangles))
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(body.data);bm.free();body.data.update()
    for f in body.data.polygons:f.use_smooth=True
    buckets={name:[] for name in ['head','torso','legs','arms','hands','feet']}
    for poly in body.data.polygons:
        p=body.matrix_world@poly.center
        if p.z>1.47:name='head'
        elif p.z<.105:name='feet'
        elif p.z<.84:name='legs'
        elif abs(p.x)>.455:name='hands'
        elif abs(p.x)>(.178 if male else .164) and p.z>1.035:name='arms'
        else:name='torso'
        buckets[name].append(tuple(poly.vertices))
    regions=[]
    for name,polys in buckets.items():
        remap={};vertices=[];faces=[]
        for face in polys:
            indices=[]
            for old in face:
                if old not in remap:remap[old]=len(vertices);vertices.append(body.matrix_world@body.data.vertices[old].co)
                indices.append(remap[old])
            faces.append(indices)
        obj=mesh('Body_'+name,vertices,faces,skin);obj.data.validate();obj.data.update();obj['bodyPart']=name;obj['part']='head' if name=='head' else 'hem' if name in ('legs','feet') else 'garment'
        weight(obj,arm,name);regions.append(obj)
    bpy.data.objects.remove(body,do_unlink=True)
    folder=OUT/gender;folder.mkdir(exist_ok=True)
    export(folder/'base_avatar.glb',regions,arm)
    baseTris=sum(len(f.vertices)-2 for obj in regions for f in obj.data.polygons)
    for obj in regions:obj.hide_set(True)
    pants=material('Fabric_Pants',(1,1,1),.7,.2)
    trouserObjects=[]
    for sign in [-1,1]:
        obj=ring_surface('Silk_Pants',[(.955,.098,.100),(.70,.087,.087),(.49,.079,.077),(.075,.101,.088)],pants,rows=44,fold=.003)
        obj.location.x=sign*.091;bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.transform_apply(location=True,rotation=False,scale=False)
        obj['part']='hem';weight(obj,arm,'legs');trouserObjects.append(obj)
    export(folder/'pants.glb',trouserObjects,arm)
    for obj in trouserObjects:obj.hide_set(True)
    lining=material('Fabric_Lining',(1,1,1),.72,.2)
    inner=ring_surface('Inner_Shirt',[(1.416,.151 if not male else .176,.091),(1.26,.148,.096),(1.10,.120,.078),(.89,.177,.105)],lining)
    weight(inner,arm);export(folder/'lining.glb',[inner],arm);inner.hide_set(True)
    for garment in ['ao_dai','ao_dai_cach_tan','ao_ngu_than','ao_tac','nhat_binh','giao_linh','doi_kham']:
        broad=garment in ['ao_tac','nhat_binh','giao_linh','doi_kham'];fitted=garment.startswith('ao_dai');opened=garment=='doi_kham'
        hem=.53 if garment=='ao_dai_cach_tan' else .10 if fitted else .17 if broad else .23
        top=[(1.418,.174 if male else .156,.098),(1.28,.178 if male else .162,.114),
            (1.105,.147 if male else .130,.089),(.96,.176 if male else .189,.114)] if fitted else [(1.418,shoulder+.008,.109),(1.28,shoulder+.010,.118),(1.105,shoulder+.003,.112),(.96,shoulder+.022,.120)]
        slit=1.105 if fitted else .96
        waist=top[2] if fitted else top[-1];topsections=top[:3] if fitted else top
        objects=[]
        neckR=.051 if male else .044
        angle=(.22,math.tau-.22) if opened else (-math.pi,math.pi)
        yoke=ring_surface('Shoulder_Yoke',[(1.463,neckR,.051),(1.425,shoulder+.018,.104),(1.400,shoulder+.014,.108)],cloth,angle=angle,rows=10)
        objects.append(yoke)
        torsoObj=ring_surface('Ao_Torso',topsections,pattern,angle=angle,rows=32)
        objects.append(torsoObj)
        skirt=[(slit+.005,waist[1],waist[2]),(.96,top[-1][1],top[-1][2]),(hem,top[-1][1]+(.039 if broad else .027),.135)] if fitted else [(slit+.005,top[-1][1],top[-1][2]),(hem,top[-1][1]+.034,.141)]
        if broad and not opened:objects.append(ring_surface('Robe_Skirt',skirt,pattern,rows=48,fold=.004))
        else:
            for flap,a in [('Front',(-1.44,1.44)),('Back',(math.pi-1.44,math.pi+1.44))]:
                obj=ring_surface('Flap_'+flap+'_Mesh',skirt,pattern if flap=='Front' else cloth,angle=a,rows=48,fold=.003)
                obj['part']='hem';weight(obj,arm,flap=flap);objects.append(obj)
        if garment not in ['giao_linh','doi_kham','nhat_binh']:
            objects.append(ring_surface('Standing_Collar',[(1.49,neckR,.049),(1.438,neckR+.006,.055)],cloth,rows=8,cols=48))
        elif garment=='nhat_binh':
            for x in [-.077,.077]:objects.append(tube('Rectangular_Collar',[point(x,1.44,.103),point(x,1.23,.116)],[.024,.024],trim))
            objects.append(tube('Collar_Bridge',[point(-.08,1.24,.119),point(.08,1.24,.119)],[.027,.027],trim))
        elif garment=='giao_linh':
            objects.append(tube('Cross_Collar',[point(-.044,1.475,.045),point(.03,1.36,.121),point(.13,1.25,.102)],[.015,.015,.015],trim))
        for side,(sh,el,wr) in joints.items():
            sleeve=tube('Raglan_Sleeve', [sh,el,wr], [.056 if not male else .064,.054 if not broad else .085,.034 if not broad else .126],cloth,rows=44)
            objects.append(sleeve)
        # A restrained closure line plus five small buttons on the right front.
        if garment not in ['giao_linh','doi_kham','nhat_binh']:
            pts=[point(.012,1.425,.112),point(.095,1.365,.104),point(.132,1.30,.087),point(.122,1.115,.073)]
            objects.append(tube('Right_Closure',pts,[.0015]*4,trim,rows=28,cols=8))
            for i in range(5):objects.append(sphere('Button',point(.121 if i else .077,1.39-i*.066,.096),(.0035,.003,.0035),trim))
        for obj in objects:
            if not obj.vertex_groups:weight(obj,arm)
            if not obj.get('part'):obj['part']='collar' if 'Collar' in obj.name or 'Closure' in obj.name else 'garment'
        export(folder/(garment+'.glb'),objects,arm)
        for obj in objects:obj.hide_set(True)
    height=1.66 if gender=='nu' else 1.78
    MANIFEST['profiles'][gender]={'height':height,'referenceHeight':1.78,'avatar':f'/models/fitting/{gender}/base_avatar.glb','triangles':baseTris,'restPose':'A-pose','wireframe':False}
    print(f'Built {gender}: {baseTris} body triangles')

(OUT/'manifest.json').write_text(json.dumps(MANIFEST,indent=2),encoding='utf-8')
print('GLB assets written to',OUT)
