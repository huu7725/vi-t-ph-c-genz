import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ModularWardrobe, type AssetLoader } from "./ModularWardrobe";

function skeleton() {
  const hips = new THREE.Bone(); hips.name = "Hips";
  const spine = new THREE.Bone(); spine.name = "Spine"; hips.add(spine);
  const head = new THREE.Bone(); head.name = "Head"; spine.add(head);
  hips.position.y = .9; spine.position.y = .4; head.position.y = .35;
  const result = new THREE.Skeleton([hips, spine, head]);
  result.calculateInverses();
  return result;
}
function skinned(name:string, skel:THREE.Skeleton, bodyPart?:string) {
  const geo = new THREE.BoxGeometry(.2,.2,.2);
  const count = geo.getAttribute("position").count;
  geo.setAttribute("skinIndex",new THREE.Uint16BufferAttribute(new Uint16Array(count*4),4));
  const weights = new Float32Array(count*4); for(let i=0;i<count;i++)weights[i*4]=1;
  geo.setAttribute("skinWeight",new THREE.Float32BufferAttribute(weights,4));
  const mesh = new THREE.SkinnedMesh(geo,new THREE.MeshPhysicalMaterial({name:`${name}_material`}));
  mesh.name=name;mesh.bind(skel, new THREE.Matrix4());if(bodyPart)mesh.userData.bodyPart=bodyPart;
  return mesh;
}
function scene(kind:"avatar"|"garment") {
  const root=new THREE.Group();const skel=skeleton();
  if(kind==="avatar") {
    for(const part of ["head","torso","legs","arms","hands","feet"])root.add(skinned(`Body_${part}`,skel,part));
  } else root.add(skinned("AoDai",skeleton()));
  return {scene:root,animations:[]};
}
function firstPart(wardrobe:ModularWardrobe,part:"torso"|"legs") {
  const mesh=wardrobe.bodyParts.get(part)?.values().next().value;
  assert.ok(mesh);return mesh;
}
class FakeLoader implements AssetLoader {
  async loadAsync(url:string){if(url.includes("avatar"))return scene("avatar");return scene("garment");}
}

test("GLB wardrobe binds a validated common skeleton and computes aggregate clipping visibility", async()=>{
  const changed=[];const wardrobe=new ModularWardrobe(new FakeLoader(),()=>changed.push(true));
  assert.equal(await wardrobe.loadBaseAvatar("/base_avatar.glb"),true);
  assert.ok(wardrobe.avatarSkeleton);assert.deepEqual([...wardrobe.bones.keys()], ["Hips","Spine","Head"]);
  assert.equal(await wardrobe.equipItem("ao_dai","/ao_dai.glb",{hiddenBodyParts:["torso","legs"],color:"#1C3F73",sheen:.55}),true);
  assert.equal(firstPart(wardrobe,"torso").visible,false);
  assert.equal(firstPart(wardrobe,"legs").visible,false);
  const material=wardrobe.getPhysicalMaterials("ao_dai")[0];assert.equal(material.color.getHexString(),"1c3f73");assert.equal(material.sheen,.55);
  await wardrobe.equipItem("pants","/pants.glb",{hiddenBodyParts:["legs"]});
  wardrobe.unequipItem("ao_dai");assert.equal(firstPart(wardrobe,"torso").visible,true);
  assert.equal(firstPart(wardrobe,"legs").visible,false);
  wardrobe.unequipItem("pants");assert.equal(firstPart(wardrobe,"legs").visible,true);
  assert.ok(changed.length>=4);wardrobe.dispose();
});

test("invalid color, sheen and missing bone are rejected before an item is committed", async()=>{
  const wardrobe=new ModularWardrobe(new FakeLoader());await wardrobe.loadBaseAvatar("avatar.glb");
  await assert.rejects(()=>wardrobe.equipItem("bad","x.glb",{color:"red"}));
  await assert.rejects(()=>wardrobe.equipItem("bad","x.glb",{sheen:2}));
  await assert.rejects(()=>wardrobe.equipItem("bad","x.glb",{attachmentBone:"NoBone"}));
  assert.deepEqual(wardrobe.equippedSlots,[]);wardrobe.dispose();
});

test("slot replacement is atomic and stale loads cannot replace a newer slot", async()=>{
  const waiting:((value:ReturnType<typeof scene>)=>void)[]=[];
  const loader:AssetLoader={loadAsync:async(url)=>new Promise(resolve=>{if(url.includes("avatar"))resolve(scene("avatar"));else if(url.includes("slow"))waiting.push(resolve);else resolve(scene("garment"));})};
  const wardrobe=new ModularWardrobe(loader);await wardrobe.loadBaseAvatar("avatar.glb");
  const slow=wardrobe.equipItem("garment","slow.glb");const fast=wardrobe.equipItem("garment","fast.glb");
  await fast;waiting[0](scene("garment"));assert.equal(await slow,false);assert.equal(wardrobe.getItemUrl("garment"),"fast.glb");wardrobe.dispose();
});
