import * as THREE from 'three';
import { ThreeElement } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: ThreeElement<typeof THREE.Mesh>;
      planeGeometry: ThreeElement<typeof THREE.PlaneGeometry>;
      shaderMaterial: ThreeElement<typeof THREE.ShaderMaterial>;
      meshBasicMaterial: ThreeElement<typeof THREE.MeshBasicMaterial>;
    }
  }
}
