import * as THREE from 'three';

export function createWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uWaveHeight: { value: 0.5 }, uWaveSpeed: { value: 1.0 },
      uDeepColor: { value: new THREE.Color(0x0a2a3a) }, uShallowColor: { value: new THREE.Color(0x1a6a7a) },
      uFoamColor: { value: new THREE.Color(0xccddee) }, uSkyColor: { value: new THREE.Color(0x88bbdd) },
      uSunColor: { value: new THREE.Color(0xffffee) }, uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
      uRainIntensity: { value: 0.4 }, uIsNight: { value: 0.0 }, uTransparency: { value: 0.7 },
      uFresnelPower: { value: 3.0 }, uSpecularPower: { value: 64.0 },
    },
    vertexShader: `
      uniform float uTime; uniform float uWaveHeight; uniform float uWaveSpeed;
      varying vec2 vUv; varying vec3 vWorldPos; varying vec3 vNormal; varying float vWaveHeight; varying vec3 vViewDir;
      void main() {
        vUv = uv; vec3 pos = position;
        float t = uTime * uWaveSpeed;
        float wave1 = sin(pos.x * 0.08 + t * 0.3) * cos(pos.y * 0.08 + t * 0.2) * 1.2;
        float wave2 = sin(pos.x * 0.2 + t * 0.5) * cos(pos.y * 0.15 + t * 0.4) * 0.5;
        float wave3 = sin(pos.x * 0.5 + t * 0.8) * cos(pos.y * 0.5 + t * 0.6) * 0.2;
        float totalWave = (wave1 + wave2 + wave3) * uWaveHeight; pos.z += totalWave; vWaveHeight = totalWave;
        vec4 worldPosition = modelMatrix * vec4(pos, 1.0); vWorldPos = worldPosition.xyz;
        vNormal = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0); vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime; uniform vec3 uDeepColor; uniform vec3 uShallowColor; uniform vec3 uFoamColor;
      uniform vec3 uSkyColor; uniform vec3 uSunColor; uniform vec3 uSunDir;
      uniform float uRainIntensity; uniform float uIsNight; uniform float uTransparency; uniform float uFresnelPower;
      varying vec2 vUv; varying vec3 vWorldPos; varying vec3 vNormal; varying float vWaveHeight; varying vec3 vViewDir;
      float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }
      float noise(vec2 st) { vec2 i=floor(st); vec2 f=fract(st); float a=random(i); float b=random(i+vec2(1,0));
        float c=random(i+vec2(0,1)); float d=random(i+vec2(1,1)); vec2 u=f*f*(3.0-2.0*f);
        return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y; }
      float fbm(vec2 st) { float v=0.0; float a=0.5; for(int i=0;i<4;i++){v+=a*noise(st);st*=2.0;a*=0.5;} return v; }
      void main() {
        vec3 normal=normalize(vNormal); vec3 viewDir=normalize(vViewDir);
        float depth=smoothstep(-3.0,1.0,vWaveHeight); vec3 waterColor=mix(uDeepColor,uShallowColor,depth);
        float fresnel=pow(1.0-max(dot(normal,viewDir),0.0),uFresnelPower); fresnel=clamp(fresnel,0.0,1.0);
        vec3 reflectDir=reflect(-viewDir,normal);
        float skyGradient=smoothstep(-0.2,0.5,reflectDir.y); vec3 skyReflection=mix(uSkyColor*0.5,uSkyColor,skyGradient);
        vec2 causticsUv=vWorldPos.xz*0.08; float causticTime=uTime*0.8;
        float caustic1=fbm(causticsUv+vec2(causticTime*0.3,causticTime*0.2));
        float caustic2=fbm(causticsUv*1.5-vec2(causticTime*0.2,causticTime*0.4));
        float caustics=pow(caustic1*caustic2,2.0)*2.0;
        float causticMask=smoothstep(-0.5,0.5,vWaveHeight)*(1.0-uIsNight*0.8);
        waterColor+=caustics*causticMask*vec3(0.15,0.25,0.2);
        float crestFoam=smoothstep(0.3,0.6,vWaveHeight)*fbm(vWorldPos.xz*2.0+uTime*0.5);
        vec3 finalColor=mix(waterColor,skyReflection,fresnel*0.6);
        finalColor=mix(finalColor,uFoamColor,clamp(crestFoam,0.0,1.0)*0.7);
        float specular=pow(max(dot(reflectDir,uSunDir),0.0),64.0);
        finalColor+=uSunColor*specular*(1.0-uIsNight)*0.5;
        finalColor=mix(finalColor,finalColor*0.3,uIsNight*0.6);
        gl_FragColor=vec4(finalColor,uTransparency);
      }
    `,
    transparent: true, side: THREE.DoubleSide,
  });
}

// FIREFLY — fixed: clamp point size to prevent green circle at top of screen
export function createFireflyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIsNight: { value: 0.0 } },
    vertexShader: `
      uniform float uTime; uniform float uIsNight; attribute float aOffset; varying float vAlpha;
      void main() {
        vec3 pos = position;
        float t = uTime + aOffset * 10.0;
        pos.x += sin(t * 0.5 + aOffset * 3.0) * 2.0;
        pos.y += sin(t * 0.3 + aOffset * 5.0) * 1.5 + 2.0;
        pos.z += cos(t * 0.4 + aOffset * 4.0) * 2.0;
        vAlpha = (sin(t * 2.0 + aOffset * 6.0) * 0.5 + 0.5) * uIsNight;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float size = 2.5 * (150.0 / max(-mvPosition.z, 1.0));
        gl_PointSize = clamp(size, 0.0, 8.0);
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        if (vAlpha < 0.01) discard;
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float glow = 1.0 - d * d;
        gl_FragColor = vec4(0.7, 0.9, 0.25, glow * vAlpha * 0.3);
      }
    `,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
}

// SKY — with clouds and moon
export function createSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTimeOfDay: { value: 0.3 }, uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() }, uCloudTime: { value: 0 } },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() { vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform float uTimeOfDay; uniform vec3 uSunDir; uniform float uCloudTime;
      varying vec3 vWorldPos;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i=floor(p); vec2 f=fract(p); float a=hash(i); float b=hash(i+vec2(1,0));
        float c=hash(i+vec2(0,1)); float d=hash(i+vec2(1,1)); vec2 u=f*f*(3.0-2.0*f);
        return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y; }
      float fbm(vec2 p) { float v=0.0; float a=0.5; for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;} return v; }
      void main() {
        vec3 dir = normalize(vWorldPos);
        float y = dir.y * 0.5 + 0.5;
        vec3 dayTop = vec3(0.3, 0.5, 0.9); vec3 dayBottom = vec3(0.6, 0.8, 1.0);
        vec3 dayColor = mix(dayBottom, dayTop, y);
        vec3 nightTop = vec3(0.04, 0.06, 0.18); vec3 nightBottom = vec3(0.08, 0.08, 0.2);
        vec3 nightColor = mix(nightBottom, nightTop, y);
        vec3 sunsetColor = vec3(1.0, 0.4, 0.1);
        float sunsetMask = smoothstep(0.0, 0.3, y) * smoothstep(0.6, 0.3, y);
        float isNight = 1.0; float sunsetBlend = 0.0;
        if (uTimeOfDay > 0.22 && uTimeOfDay < 0.78) {
          isNight = 0.0;
          if (uTimeOfDay < 0.35) { float dawn=(uTimeOfDay-0.22)/0.13; sunsetBlend=sin(dawn*3.14159)*0.6; isNight=1.0-dawn; }
          else if (uTimeOfDay > 0.65) { float dusk=(uTimeOfDay-0.65)/0.13; sunsetBlend=sin(dusk*3.14159)*0.8; isNight=dusk; }
        }
        vec3 color = mix(dayColor, nightColor, isNight);
        color = mix(color, sunsetColor, sunsetBlend * sunsetMask);
        // Stars
        if (isNight > 0.3) {
          vec2 starUv = dir.xz / max(dir.y + 0.1, 0.01) * 50.0;
          float starVal = hash(floor(starUv));
          float twinkle = sin(starVal * 100.0 + uTimeOfDay * 60.0) * 0.5 + 0.5;
          if (starVal > 0.985 && dir.y > 0.1) {
            color += vec3(0.9, 0.95, 1.0) * (starVal - 0.985) / 0.015 * twinkle * isNight * 1.2;
          }
        }
        // Moon
        if (isNight > 0.2) {
          vec3 moonDir = normalize(vec3(-0.4, 0.7, -0.5));
          float moonDot = dot(dir, moonDir);
          color += vec3(0.85, 0.9, 1.0) * smoothstep(0.995, 0.998, moonDot) * isNight * 1.5;
          color += vec3(0.4, 0.5, 0.7) * smoothstep(0.97, 0.998, moonDot) * 0.15 * isNight;
        }
        // Clouds
        if (dir.y > 0.05) {
          vec2 cloudUv = dir.xz / dir.y * 8.0 + vec2(uCloudTime * 0.3, uCloudTime * 0.1);
          float cloud = fbm(cloudUv);
          cloud = smoothstep(0.4, 0.7, cloud);
          float cloudHeight = smoothstep(0.05, 0.3, dir.y);
          vec3 cloudColor = mix(vec3(0.9, 0.92, 0.95), vec3(1.0), 0.5);
          cloudColor = mix(cloudColor * 0.15, cloudColor, 1.0 - isNight);
          // Sunset tint on clouds
          cloudColor = mix(cloudColor, vec3(1.0, 0.6, 0.3), sunsetBlend * 0.5);
          color = mix(color, cloudColor, cloud * cloudHeight * 0.6);
        }
        // Sun glow
        float sunDot = max(dot(dir, uSunDir), 0.0);
        color += vec3(1.0, 0.9, 0.7) * pow(sunDot, 64.0) * (1.0 - isNight);
        color += vec3(1.0, 0.8, 0.5) * pow(sunDot, 8.0) * 0.2 * (1.0 - isNight);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.BackSide,
  });
}

export function createDustMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIsNight: { value: 0.0 } },
    vertexShader: `
      uniform float uTime; attribute float aOffset; varying float vAlpha;
      void main() {
        vec3 pos = position; float t = uTime * 0.3 + aOffset * 20.0;
        pos.x += sin(t*0.7+aOffset)*3.0; pos.y += sin(t*0.3+aOffset*2.0)*1.0+3.0; pos.z += cos(t*0.5+aOffset*1.5)*3.0;
        vAlpha = (sin(t*0.5)*0.5+0.5)*0.3;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = 2.0 * (200.0 / max(-mvPosition.z, 1.0));
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() { float d=length(gl_PointCoord-0.5)*2.0; if(d>1.0)discard; gl_FragColor=vec4(1.0,0.95,0.8,(1.0-d)*vAlpha); }
    `,
    transparent: true, depthWrite: false,
  });
}
