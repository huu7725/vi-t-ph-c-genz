import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";

export const bodyPartNames = ["head", "torso", "legs", "arms", "hands", "feet"] as const;
export type BodyPart = (typeof bodyPartNames)[number];
export interface EquipConfig {
  hiddenBodyParts?: readonly BodyPart[];
  materialNames?: readonly string[];
  color?: string;
  sheen?: number;
  roughness?: number;
  /** Rigid accessories must be authored in this bone's local coordinate space. */
  attachmentBone?: string;
}
export interface AssetLoader { loadAsync(url: string): Promise<Pick<GLTF, "scene" | "animations">> }
interface Resources {
  geometries: Set<THREE.BufferGeometry>;
  materials: Set<THREE.Material>;
  textures: Set<THREE.Texture>;
  skeletons: Set<THREE.Skeleton>;
}
interface Item {
  root: THREE.Group; resources: Resources; config: EquipConfig; url: string;
  materials: Set<THREE.MeshPhysicalMaterial>;
}
const isMesh=(node:THREE.Object3D):node is THREE.Mesh => (node as THREE.Mesh).isMesh===true;
const isSkinned=(node:THREE.Object3D):node is THREE.SkinnedMesh => (node as THREE.SkinnedMesh).isSkinnedMesh===true;
const materialsOf=(mesh:THREE.Mesh)=>Array.isArray(mesh.material)?mesh.material:[mesh.material];
function collectResources(root:THREE.Object3D):Resources {
  const result:Resources={geometries:new Set(),materials:new Set(),textures:new Set(),skeletons:new Set()};
  root.traverse(node=>{
    if(!isMesh(node))return;
    result.geometries.add(node.geometry);
    for(const material of materialsOf(node)) {
      result.materials.add(material);
      for(const value of Object.values(material))if((value as THREE.Texture)?.isTexture)result.textures.add(value as THREE.Texture);
    }
    if(isSkinned(node))result.skeletons.add(node.skeleton);
  });
  return result;
}
function disposeResources(resources:Resources, keepSkeleton?:THREE.Skeleton|null) {
  resources.geometries.forEach(g=>g.dispose());resources.materials.forEach(m=>m.dispose());
  resources.textures.forEach(t=>t.dispose());
  resources.skeletons.forEach(s=>{if(s!==keepSkeleton)s.dispose();});
}
function matrixMatches(a:THREE.Matrix4,b:THREE.Matrix4,tolerance=1e-4) {
  return a.elements.every((v,i)=>Math.abs(v-b.elements[i])<=tolerance);
}
function boneParentName(bone:THREE.Bone) {
  let parent=bone.parent;
  while(parent){if((parent as THREE.Bone).isBone)return parent.name;parent=parent.parent;}
  return null;
}

/**
 * Owns a GLB avatar and every equipped item. All assets use metres, a common
 * A-pose, joint names and inverse-bind transforms. No input contains executable code.
 * Replacing a slot is atomic; a superseded load is disposed without changing the scene.
 */
export class ModularWardrobe {
  readonly root=new THREE.Group();
  avatarSkeleton:THREE.Skeleton|null=null;
  readonly bodyParts=new Map<BodyPart,Set<THREE.Mesh>>();
  readonly bones=new Map<string,THREE.Bone>();
  private base:Item|null=null;
  private items=new Map<string,Item>();
  private slotVersions=new Map<string,number>();
  private enabledParts=new Map<BodyPart,boolean>(bodyPartNames.map(p=>[p,true]));
  private epoch=0;
  private disposed=false;
  private loadingBase=false;
  constructor(private loader:AssetLoader=new GLTFLoader(),private changed:()=>void=()=>{}) {
    this.root.name="ModularCharacter";
  }
  get equippedSlots():readonly string[]{return [...this.items.keys()];}
  getItem(slot:string){return this.items.get(slot)?.root;}
  getItemUrl(slot:string){return this.items.get(slot)?.url;}

  async loadBaseAvatar(url:string):Promise<boolean> {
    this.assertAlive();const epoch=++this.epoch;this.loadingBase=true;
    let candidate:Item|undefined;
    try {
      const gltf=await this.loader.loadAsync(url);
      candidate={root:gltf.scene,resources:collectResources(gltf.scene),materials:new Set(),url,config:{}};
      if(this.disposed||epoch!==this.epoch){disposeResources(candidate.resources);return false;}
      const meshes:THREE.SkinnedMesh[]=[];gltf.scene.traverse(n=>{if(isSkinned(n))meshes.push(n);});
      if(!meshes.length)throw new Error("Avatar GLB phải có SkinnedMesh và skeleton.");
      const canonical=meshes[0].skeleton;
      const names=canonical.bones.map(b=>b.name);
      if(names.some(n=>!n)||new Set(names).size!==names.length)throw new Error("Tên xương avatar bị thiếu hoặc trùng.");
      const nextParts=new Map<BodyPart,Set<THREE.Mesh>>();
      gltf.scene.traverse(node=>{
        if(!isMesh(node))return;
        let owner:THREE.Object3D|null=node;let part:string|undefined;
        while(owner){const p=owner.userData.bodyPart||owner.name.toLowerCase();if(bodyPartNames.includes(p as BodyPart)){part=p;break;}owner=owner.parent;}
        if(part){const group=nextParts.get(part as BodyPart)||new Set();group.add(node);nextParts.set(part as BodyPart,group);}
        node.castShadow=true;node.receiveShadow=true;node.frustumCulled=false;
      });
      for(const part of bodyPartNames)if(!nextParts.has(part))throw new Error(`Avatar thiếu mesh vùng ${part}.`);
      for(const mesh of meshes) this.rebindMesh(mesh,canonical,candidate.resources);
      // Commit only after every mesh and region has been validated.
      this.clearCurrent();this.avatarSkeleton=canonical;this.base=candidate;
      this.bodyParts.clear();nextParts.forEach((set,key)=>this.bodyParts.set(key,set));
      this.bones.clear();canonical.bones.forEach(b=>this.bones.set(b.name,b));
      this.root.add(gltf.scene);this.refreshVisibility();this.changed();return true;
    }catch(error){if(candidate&&candidate!==this.base)disposeResources(candidate.resources,this.avatarSkeleton);throw error;}
    finally{if(epoch===this.epoch)this.loadingBase=false;}
  }

  async equipItem(slotName:string,itemUrl:string,config:EquipConfig={}):Promise<boolean> {
    this.assertAlive();
    if(!this.avatarSkeleton||this.loadingBase)throw new Error("Chờ avatar tải xong trước khi thay trang phục.");
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(slotName))throw new Error("Tên slot không hợp lệ.");
    for(const part of config.hiddenBodyParts||[])if(!bodyPartNames.includes(part))throw new Error(`Vùng cơ thể không hợp lệ: ${part}`);
    if(config.color)this.assertColor(config.color);
    if(config.sheen!==undefined)this.assertUnit(config.sheen,"sheen");
    if(config.roughness!==undefined)this.assertUnit(config.roughness,"roughness");
    const epoch=this.epoch,version=(this.slotVersions.get(slotName)||0)+1;this.slotVersions.set(slotName,version);
    const gltf=await this.loader.loadAsync(itemUrl);
    const item:Item={root:gltf.scene,url:itemUrl,config:{...config,hiddenBodyParts:[...(config.hiddenBodyParts||[])]},resources:collectResources(gltf.scene),materials:new Set()};
    if(this.disposed||epoch!==this.epoch||this.slotVersions.get(slotName)!==version){disposeResources(item.resources);return false;}
    try {
      const skinned:THREE.SkinnedMesh[]=[];
      gltf.scene.traverse(node=>{if(isSkinned(node))skinned.push(node);});
      if(config.attachmentBone&&skinned.length)throw new Error("Không gắn một asset skinned vào bone lần thứ hai.");
      if(config.attachmentBone&&!this.bones.has(config.attachmentBone))throw new Error(`Không có bone ${config.attachmentBone}.`);
      for(const mesh of skinned)this.rebindMesh(mesh,this.avatarSkeleton,item.resources);
      // Old imported joint trees are no longer used after rebinding.
      const oldRoots:THREE.Bone[]=[];
      gltf.scene.traverse(node=>{if((node as THREE.Bone).isBone&&!(node.parent as THREE.Bone)?.isBone)oldRoots.push(node as THREE.Bone);});
      oldRoots.forEach(b=>b.removeFromParent());
      const converted=new Map<THREE.Material,THREE.MeshPhysicalMaterial>();
      gltf.scene.traverse(node=>{
        if(!isMesh(node))return;
        node.castShadow=true;node.receiveShadow=true;node.frustumCulled=false;
        const next=materialsOf(node).map(source=>{
          if(!(source as THREE.MeshStandardMaterial).isMeshStandardMaterial)return source;
          if(config.materialNames&&!config.materialNames.includes(source.name))return source;
          let physical=converted.get(source);
          if(!physical){
            if((source as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial)physical=source as THREE.MeshPhysicalMaterial;
            else {physical=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(physical,source);item.resources.materials.add(physical);}
            if(config.color)physical.color.set(config.color);
            if(config.sheen!==undefined)physical.sheen=config.sheen;
            if(config.roughness!==undefined)physical.roughness=config.roughness;
            converted.set(source,physical);item.materials.add(physical);
          }
          return physical;
        });
        node.material=Array.isArray(node.material)?next:next[0];
      });
      const old=this.items.get(slotName);
      const parent=config.attachmentBone?this.bones.get(config.attachmentBone)!:this.root;
      parent.add(gltf.scene);this.items.set(slotName,item);
      if(old){old.root.removeFromParent();disposeResources(old.resources,this.avatarSkeleton);}
      this.refreshVisibility();this.changed();return true;
    }catch(error){disposeResources(item.resources,this.avatarSkeleton);throw error;}
  }

  unequipItem(slotName:string) {
    this.slotVersions.set(slotName,(this.slotVersions.get(slotName)||0)+1);
    const item=this.items.get(slotName);if(!item)return;
    item.root.removeFromParent();this.items.delete(slotName);disposeResources(item.resources,this.avatarSkeleton);
    this.refreshVisibility();this.changed();
  }
  setBodyPartEnabled(part:BodyPart,enabled:boolean){this.enabledParts.set(part,enabled);this.refreshVisibility();this.changed();}
  updateMaterialColor(slotName:string,hexColor:string){this.assertColor(hexColor);for(const material of this.item(slotName).materials)material.color.set(hexColor);this.changed();}
  updateSheen(slotName:string,intensity:number){this.assertUnit(intensity,"sheen");for(const m of this.item(slotName).materials){const toggle=(m.sheen===0)!==(intensity===0);m.sheen=intensity;if(toggle)m.needsUpdate=true;}this.changed();}
  updateRoughness(slotName:string,value:number){this.assertUnit(value,"roughness");for(const m of this.item(slotName).materials)m.roughness=value;this.changed();}
  getPhysicalMaterials(slotName:string){return [...this.item(slotName).materials];}
  /** Call after posing before a pick, or for externally supplied animation bounds. */
  updateBounds(){this.root.updateMatrixWorld(true);this.avatarSkeleton?.update();this.root.traverse(n=>{if(isSkinned(n)){n.computeBoundingSphere();n.computeBoundingBox();}});}
  dispose(){if(this.disposed)return;this.disposed=true;++this.epoch;this.clearCurrent();this.root.removeFromParent();this.bodyParts.clear();this.bones.clear();}

  private rebindMesh(mesh:THREE.SkinnedMesh,canonical:THREE.Skeleton,resources:Resources) {
    const source=mesh.skeleton,indices=mesh.geometry.getAttribute("skinIndex"),weights=mesh.geometry.getAttribute("skinWeight");
    if(!indices||!weights||indices.itemSize!==4||weights.itemSize!==4||indices.count!==weights.count)throw new Error(`Skin attributes không hợp lệ: ${mesh.name}`);
    const mapping=source.bones.map((bone,i)=>{
      const target=canonical.bones.findIndex(b=>b.name===bone.name);
      if(target<0)throw new Error(`Trang phục dùng bone không có trên avatar: ${bone.name}`);
      if(!matrixMatches(source.boneInverses[i],canonical.boneInverses[target]))throw new Error(`Rest pose/inverse bind không khớp tại ${bone.name}.`);
      if(boneParentName(bone)!==boneParentName(canonical.bones[target]))throw new Error(`Hierarchy không khớp tại ${bone.name}.`);
      return target;
    });
    if(source!==canonical) {
      const geometry=mesh.geometry.clone();resources.geometries.add(geometry);mesh.geometry=geometry;
      const result=new Uint16Array(indices.count*4);
      for(let v=0;v<indices.count;v++) {
        let sum=0;
        for(let c=0;c<4;c++) {
          const weight=weights.getComponent(v,c),index=indices.getComponent(v,c);
          if(!Number.isFinite(weight)||weight<0||weight>1.0001)throw new Error(`Weight không hợp lệ tại vertex ${v}.`);
          sum+=weight;
          if(weight>0&&(!Number.isInteger(index)||index<0||index>=mapping.length))throw new Error(`Skin index ngoài palette tại vertex ${v}.`);
          result[v*4+c]=weight>0?mapping[index]:0;
        }
        if(sum<1e-6)throw new Error(`Vertex ${v} chưa được weight.`);
      }
      geometry.setAttribute("skinIndex",new THREE.Uint16BufferAttribute(result,4));mesh.normalizeSkinWeights();
    }
    // Attached mode: avatar and item are children of the same character root.
    mesh.bindMode=THREE.AttachedBindMode;
    mesh.bind(canonical,mesh.bindMatrix.clone());
    mesh.frustumCulled=false;
  }
  private refreshVisibility(){
    const hidden=new Set<BodyPart>();this.items.forEach(i=>i.config.hiddenBodyParts?.forEach(p=>hidden.add(p)));
    this.bodyParts.forEach((meshes,part)=>meshes.forEach(m=>{m.visible=(this.enabledParts.get(part)??true)&&!hidden.has(part);}));
  }
  private clearCurrent(){
    this.items.forEach(i=>{i.root.removeFromParent();disposeResources(i.resources,this.avatarSkeleton);});this.items.clear();this.slotVersions.clear();
    if(this.base){this.base.root.removeFromParent();disposeResources(this.base.resources);this.base=null;}
    this.avatarSkeleton=null;
  }
  private item(slot:string){const item=this.items.get(slot);if(!item)throw new Error(`Slot ${slot} chưa có trang phục.`);return item;}
  private assertAlive(){if(this.disposed)throw new Error("Wardrobe đã được dispose.");}
  private assertColor(color:string){if(!/^#[0-9a-fA-F]{6}$/.test(color))throw new Error("Màu phải là HEX #RRGGBB.");}
  private assertUnit(value:number,name:string){if(!Number.isFinite(value)||value<0||value>1)throw new Error(`${name} phải trong khoảng 0–1.`);}
}
