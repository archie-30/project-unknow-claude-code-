class TimeOfDay {
  constructor() {
    this.time = CONFIG.startTimeOfDay;
    const c = (hex) => new THREE.Color(hex);
    this.keys = [
      { t: 0.0, top: c(0x101a38), horizon: c(0x2d3f66), light: c(0x9fb6e0), intensity: 0.26, hemiSky: c(0x4a5f8a), hemiGround: c(0x262c3a), hemi: 0.42, cloud: c(0x6d7896) },
      { t: 0.2, top: c(0x1d2f5c), horizon: c(0x5c628e), light: c(0x9fb6e0), intensity: 0.2, hemiSky: c(0x5a6690), hemiGround: c(0x2e3240), hemi: 0.42, cloud: c(0x8a8aa6) },
      { t: 0.255, top: c(0x6f9bd0), horizon: c(0xf6b387), light: c(0xffb27a), intensity: 0.45, hemiSky: c(0xc9b8c8), hemiGround: c(0x8c7a68), hemi: 0.5, cloud: c(0xffd2b8) },
      { t: 0.32, top: c(0x7cbde8), horizon: c(0xfde6c6), light: c(0xffe0b0), intensity: 0.78, hemiSky: c(0xcfe4f2), hemiGround: c(0xb8a98a), hemi: 0.55, cloud: c(0xfdf6ee) },
      { t: 0.5, top: c(0x6db6e6), horizon: c(0xf3f0e2), light: c(0xfff2d6), intensity: 0.88, hemiSky: c(0xd3e8f4), hemiGround: c(0xbcae90), hemi: 0.58, cloud: c(0xffffff) },
      { t: 0.66, top: c(0x70b3e2), horizon: c(0xfff0d4), light: c(0xffdf9f), intensity: 0.8, hemiSky: c(0xd6e6ef), hemiGround: c(0xc2ad86), hemi: 0.56, cloud: c(0xfff8ec) },
      { t: 0.735, top: c(0x7a8cc6), horizon: c(0xf6a27a), light: c(0xff9c68), intensity: 0.5, hemiSky: c(0xd8b6b8), hemiGround: c(0x9a7a64), hemi: 0.5, cloud: c(0xffc4a4) },
      { t: 0.79, top: c(0x2c3c70), horizon: c(0x98708f), light: c(0x9fb6e0), intensity: 0.2, hemiSky: c(0x6a6890), hemiGround: c(0x34323e), hemi: 0.44, cloud: c(0x8a7c9a) },
      { t: 1.0, top: c(0x101a38), horizon: c(0x2d3f66), light: c(0x9fb6e0), intensity: 0.26, hemiSky: c(0x4a5f8a), hemiGround: c(0x262c3a), hemi: 0.42, cloud: c(0x6d7896) },
    ];
    this.env = {
      skyTop: new THREE.Color(),
      skyHorizon: new THREE.Color(),
      fogColor: new THREE.Color(),
      sunColor: new THREE.Color(),
      lightColor: new THREE.Color(),
      hemiSky: new THREE.Color(),
      hemiGround: new THREE.Color(),
      cloudColor: new THREE.Color(),
      sunDirection: new THREE.Vector3(),
      moonDirection: new THREE.Vector3(),
      lightDirection: new THREE.Vector3(),
      lightIntensity: 0.8,
      hemiIntensity: 0.55,
      ambientIntensity: 0.12,
      night: 0,
      daylight: 1,
      overcast: 0,
      wind: 1,
      fog: 0,
      dust: 0,
    };
    this.grey = new THREE.Color(0xa7adb2);
    this.greyHorizon = new THREE.Color(0xd2d4d0);
    this.dustColor = new THREE.Color(0xd9b98a);
    this.fogWhite = new THREE.Color(0xe6e8e6);
  }

  update(dt, weather) {
    this.time = (this.time + dt / CONFIG.dayLength) % 1;
    const e = this.env;
    let i = 0;
    while (i < this.keys.length - 2 && this.time > this.keys[i + 1].t) i++;
    const a = this.keys[i];
    const b = this.keys[i + 1];
    const f = smoothstep(0, 1, (this.time - a.t) / (b.t - a.t));
    e.skyTop.copy(a.top).lerp(b.top, f);
    e.skyHorizon.copy(a.horizon).lerp(b.horizon, f);
    e.lightColor.copy(a.light).lerp(b.light, f);
    e.hemiSky.copy(a.hemiSky).lerp(b.hemiSky, f);
    e.hemiGround.copy(a.hemiGround).lerp(b.hemiGround, f);
    e.cloudColor.copy(a.cloud).lerp(b.cloud, f);
    e.lightIntensity = lerp(a.intensity, b.intensity, f);
    e.hemiIntensity = lerp(a.hemi, b.hemi, f);

    const angle = (this.time - 0.25) * Math.PI * 2;
    e.sunDirection.set(Math.cos(angle), Math.sin(angle) * 0.95, 0.38).normalize();
    e.moonDirection.set(-Math.cos(angle), -Math.sin(angle) * 0.9, -0.3).normalize();
    e.night = smoothstep(0.08, -0.12, e.sunDirection.y);
    e.daylight = 1 - e.night;
    e.sunColor.copy(e.lightColor);
    e.lightDirection.copy(e.sunDirection.y > -0.02 ? e.sunDirection : e.moonDirection);
    if (e.lightDirection.y < 0.22) {
      e.lightDirection.y = 0.22;
      e.lightDirection.normalize();
    }

    e.overcast = weather.overcast;
    e.wind = weather.wind;
    e.fog = weather.fog;
    e.dust = weather.dust;
    const o = e.overcast;
    e.skyTop.lerp(this.grey, o * 0.65);
    e.skyHorizon.lerp(this.greyHorizon, o * 0.5);
    e.cloudColor.lerp(this.grey, o * 0.55);
    e.lightIntensity *= 1 - o * 0.62;
    e.hemiIntensity *= 1 - o * 0.1;
    e.ambientIntensity = 0.1 + o * 0.12;

    e.fogColor.copy(e.skyHorizon);
    e.fogColor.lerp(this.fogWhite.clone().multiplyScalar(0.35 + 0.65 * e.daylight), e.fog * 0.6);
    e.fogColor.lerp(this.dustColor.clone().multiplyScalar(0.4 + 0.6 * e.daylight), e.dust * 0.75);
    return e;
  }

  get clock() {
    const minutes = Math.floor(this.time * 24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
}
