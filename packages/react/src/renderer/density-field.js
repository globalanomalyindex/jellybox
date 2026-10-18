import { MOTION, sampleBezier, stepJellyResponse } from './motion.js';

// A filled concentration within the parent optical volume, not another mesh.
// The fragment shader and receiver tracing share this thickness profile.
export const FOLDER_DENSITY = Object.freeze({ width: 204, handleHeight: 44, shoulder: 26, radius: 22, join: 16 });

// A shared-clock breath wakes the parent concentration on approach. The host
// eases gain; the field supplies geometry, normals and receiver response together.
export function densityHoverResponse(gain, time, moving = true) {
  if (!moving || gain <= 0) return { amount: 0, jiggle: 0 };
  const g = Math.max(0, Math.min(1, gain));
  const breath = time * Math.PI * 2 / (MOTION.breathe / 1000);
  const current = time * Math.PI * 2 / (MOTION.activityOrbit / 1000);
  // The current transfers the crown through the volume. Its small shoulder
  // strain stays under 1.2px, while thickness makes the invitation readable.
  return { amount: g * (.13 + .025 * Math.cos(breath)),
    jiggle: g * .2 * Math.sin(current) * (.9 + .1 * Math.cos(breath)) };
}

// Parent and child share one material envelope. The child takes active energy
// gradually, leaving a quiet connection while the same angle brakes to rest.
function folderDonorAnchor(width, height, y) {
  return { x: width / 2 - 7, y: Math.max(-height / 2 + 22, Math.min(height / 2 - 58, y)) };
}

export function stepFolderAttention(body, { hover = false, childActive = false, receiver = null, width = 400, height = 220 }, seconds, { instant = false, moving = true, initialCurrent = 0 } = {}) {
  const target = childActive ? .12 : hover ? 1 : 0;
  const displayed = body.responses?.densityHover?.value ?? target;
  const withdrawing = target < displayed;
  const dt = Math.max(0, seconds);
  let gain;
  let transfer = body.folderTransfer;
  if (receiver || transfer) {
    body.responses ||= {};
    const response = body.responses.densityHover ||= { value: target, from: target, target, elapsed: 0 };
    const receiverId = receiver?.id ?? null;
    if (!transfer) {
      const source = folderDonorAnchor(width, height, receiver.y);
      transfer = body.folderTransfer = { receiverId: null, source, point: { ...source }, flow: 0, borrowed: 0, receivers: [] };
    }
    // The anchor belongs to the actual parent shoulder. A responsive resize
    // rebases that shoulder without restarting the attention transaction.
    if (transfer.width !== undefined && (transfer.width !== width || transfer.height !== height)) {
      const source = folderDonorAnchor(width, height, transfer.source.y);
      const dx = source.x - transfer.source.x, dy = source.y - transfer.source.y;
      transfer.source = source;
      if (!transfer.receiverId) {
        transfer.point = { x: transfer.point.x + dx, y: transfer.point.y + dy };
        if (transfer.from) transfer.from.point = { x: transfer.from.point.x + dx, y: transfer.from.point.y + dy };
      }
    }
    transfer.width = width; transfer.height = height;
    if (!transfer.from || response.target !== target || transfer.receiverId !== receiverId) {
      // A single snapshot owns context, transport and all receiver shares.
      // A returning packet keeps its path even when pointer-only focus retains
      // the parent's quiet contextual floor.
      if (transfer.borrowed < .00001 && !transfer.flow && receiver) {
        transfer.source = folderDonorAnchor(width, height, receiver.y);
        transfer.point = { ...transfer.source };
      }
      transfer.from = { point: { ...transfer.point }, flow: transfer.flow, borrowed: transfer.borrowed,
        receivers: transfer.receivers.filter(entry => entry.weight > .00001).slice(0, 32) };
      transfer.transporting = transfer.receiverId !== receiverId || transfer.flow > .00001
        || Math.abs(transfer.borrowed - (receiver ? 1 : 0)) > .00001;
      transfer.receiverId = receiverId;
      const returning = !receiver && (transfer.borrowed > .00001 || transfer.flow > .00001 || transfer.receivers.length > 0);
      transfer.duration = target < response.value || returning ? MOTION.sliderMelt : MOTION.sliderGather;
      transfer.curve = target < response.value || returning ? MOTION.withdraw : MOTION.gather;
      response.from = response.value; response.target = target; response.elapsed = 0;
    }
    response.elapsed = instant ? transfer.duration : Math.min(transfer.duration, response.elapsed + dt * 1000);
    const p = sampleBezier(transfer.curve, response.elapsed / transfer.duration), from = transfer.from;
    gain = response.value = response.from + (target - response.from) * p;
    const destination = receiver || transfer.source;
    transfer.point = p === 1 || !transfer.transporting ? { x: destination.x, y: destination.y }
      : { x: from.point.x + (destination.x - from.point.x) * p, y: from.point.y + (destination.y - from.point.y) * p };
    transfer.borrowed = from.borrowed + ((receiver ? 1 : 0) - from.borrowed) * p;
    transfer.flow = transfer.transporting ? Math.min(1, from.flow * (1 - p) + 4 * p * (1 - p)) : 0;
    // Shares follow departure/arrival, not the newest ID alone. Captured old
    // shares decay from their displayed value when a route is interrupted.
    const shares = transfer.transporting ? from.receivers.map(entry => ({ id: entry.id,
      weight: receiver?.id === entry.id ? entry.weight + (1 - entry.weight) * p * p : entry.weight * (1 - p) ** 2 })) : [];
    if (receiver) {
      const existing = shares.find(entry => entry.id === receiver.id);
      if (!existing) shares.push({ id: receiver.id, weight: transfer.transporting ? p * p : 1 });
    }
    transfer.receivers = shares.filter(entry => entry.weight > .00001).slice(-32);
  } else {
    gain = stepJellyResponse(body, 'densityHover', target, dt,
      { duration: withdrawing ? MOTION.sliderMelt : MOTION.sliderGather,
        curve: withdrawing ? MOTION.withdraw : MOTION.gather, instant });
  }
  if (!Number.isFinite(body.densityCurrent)) body.densityCurrent = initialCurrent;
  const speed = Math.max(0, Math.min(1, (gain - .12) / .88));
  if (moving && !instant) body.densityCurrent += dt * Math.PI * 2 / (MOTION.activityOrbit / 1000) * speed * speed * (3 - 2 * speed);
  return transfer ? { gain, current: body.densityCurrent, transfer: { source: transfer.source, point: transfer.point,
    flow: transfer.flow, borrowed: transfer.borrowed, receivers: transfer.receivers } } : { gain, current: body.densityCurrent };
}

// Local material strain, independent of layout and the native disclosure state.
// Retain momentum when the disclosure reverses; reduced motion clears it.
export function stepDensitySettle(previous, phase, seconds, instant = false) {
  const p = Math.max(0, Math.min(1, phase));
  if (!previous || instant) return { phase: p, strain: 0, velocity: 0 };
  const dt = Math.max(0, Math.min(.1, seconds));
  if (!dt) return previous;
  const target = Math.max(-.5, Math.min(1, (previous.phase - p) / dt * .16));
  let velocity = previous.velocity;
  // A shallow final compression carries the gathered mass through one recoil.
  if (previous.phase > .025 && p <= .025) velocity -= 15;
  if (previous.phase < .975 && p >= .975) velocity += 6;
  const frequency = 24, decay = .45 * frequency, wd = frequency * Math.sqrt(1 - .45 ** 2);
  const offset = previous.strain - target, b = (velocity + decay * offset) / wd;
  const e = Math.exp(-decay * dt), c = Math.cos(wd * dt), s = Math.sin(wd * dt);
  let strain = target + e * (offset * c + b * s);
  velocity = e * ((b * wd - decay * offset) * c - (offset * wd + decay * b) * s);
  if (Math.abs(strain) > 1) { strain = Math.sign(strain); velocity = 0; }
  if (target === 0 && Math.abs(strain) < .0002 && Math.abs(velocity) < .003) strain = velocity = 0;
  return { phase: p, strain, velocity };
}
function roundedField(x, y, width, height, radius) {
  const qx = Math.abs(x) - width / 2 + radius, qy = Math.abs(y) - height / 2 + radius;
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0), length = Math.hypot(ox, oy);
  return [length + Math.min(Math.max(qx, qy), 0) - radius,
    (length ? ox / length : qx > qy ? 1 : 0) * Math.sign(x),
    (length ? oy / length : qy >= qx ? 1 : 0) * Math.sign(y)];
}

export function densityFieldProfile(x, y, { width, height, amount = 1, edge = 24, flow = 0, fold = 0, folder = false, jiggle = 0, hover = 0, current = 0, transfer = null }, detail) {
  if (detail) detail.gather = 0;
  if ((amount === 0 && flow === 0) || Math.abs(x) > width / 2 + 80 || Math.abs(y) > height / 2 + 80) return { height: 0, dx: 0, dy: 0, pigment: 0 };
  const radius = Math.min(32, width / 2, height / 2);
  let [d, nx, ny] = roundedField(x, y, width, height, radius);
  let crownXPosition=x, crownYPosition=y, crownWidth=width, crownHeight=height;
  if (folder) {
    const p = Math.max(0, Math.min(1, fold));
    const tabWidth = Math.min(FOLDER_DENSITY.width, width), tabHeight = FOLDER_DENSITY.handleHeight;
    // Stretch the actual volume; interpolating distances creates a diagonal
    // wipe through it. Reach leads depth, then the rounded shoulder gathers.
    const reach = 1 - (1 - p) ** 1.6;
    const shoulderPhase = Math.max(0, Math.min(1, (p - .2) / .8));
    const shoulder = FOLDER_DENSITY.shoulder * shoulderPhase ** 2 * (3 - 2 * shoulderPhase);
    const restWidth = tabWidth + (width - tabWidth) * reach;
    const stretch = 6 * Math.max(-1, Math.min(1, jiggle)) * (1 - .65 * p);
    const bodyWidth = restWidth + stretch;
    const wholeHeight = (tabHeight + (height - tabHeight) * p) / (1 + stretch / restWidth);
    const looseness = Math.sin(Math.PI * p);
    const corner = FOLDER_DENSITY.radius + 16 * looseness + 3 * looseness ** 2 * Math.sin(3 * Math.PI * p);
    const join = FOLDER_DENSITY.join + 12 * looseness;
    const bodyHeight = wholeHeight - shoulder;
    const bx = x + width / 2 - bodyWidth / 2;
    const tab = roundedField(x + width / 2 - tabWidth / 2, y - height / 2 + tabHeight / 2, tabWidth, tabHeight, FOLDER_DENSITY.radius);
    const body = roundedField(bx, y - height / 2 + shoulder + bodyHeight / 2, bodyWidth, bodyHeight, Math.min(corner, bodyHeight / 2));
    const blend = Math.max(0, Math.min(1, .5 + .5 * (tab[0] - body[0]) / join));
    const joined = tab.map((value, i) => value + (body[i] - value) * blend);
    joined[0] -= join * blend * (1 - blend);
    const envelope = roundedField(bx, y - height / 2 + wholeHeight / 2, bodyWidth, wholeHeight, Math.min(corner, wholeHeight / 2));
    // Smooth unions expand coincident edges. Constrain that surplus to one
    // envelope so the summary's left edge stays flush through the join.
    if (envelope[0] > joined[0]) joined.splice(0, 3, ...envelope);
    [d, nx, ny] = joined;
    crownXPosition = bx; crownYPosition = y - height / 2 + wholeHeight / 2;
    crownWidth = bodyWidth; crownHeight = wholeHeight;
    // A local transfer of the optical crown, rather than uniform scaling.
    // CPU geometry, analytic normals and receiver filtering share this field.
    crownXPosition -= Math.max(-.24, Math.min(.24, jiggle)) * crownWidth * .75;
  }
  const t = Math.max(0, Math.min(1, (d + edge) / (edge * 2)));
  const coverage = 1 - t ** 3 * (t * (t * 6 - 15) + 10);
  const slope = -30 * t * t * (t - 1) ** 2 / (edge * 2);
  const u = Math.max(0, Math.min(1, (d + 24) / 80));
  const surround = 1 - u ** 3 * (u * (u * 6 - 15) + 10);
  const donor = Math.max(0, surround - coverage);
  const donorSlope = donor > 0 ? -30 * u * u * (u - 1) ** 2 / 80 - slope : 0;
  const hx = crownWidth / 2, hy = crownHeight / 2;
  const cx = Math.max(0, 1 - (crownXPosition / hx) ** 2), cy = Math.max(0, 1 - (crownYPosition / hy) ** 2);
  const crown = cx * cx * cy * cy;
  const crownX = -4 * crownXPosition / (hx * hx) * cx * cy * cy;
  const crownY = -4 * crownYPosition / (hy * hy) * cy * cx * cx;
  let gathered = 0, gatheredX = 0, gatheredY = 0;
  if (folder && hover > 0) {
    const gain = Math.max(0, Math.min(1, hover)), inside = -d;
    const riseT = Math.max(0, Math.min(1, inside / 3));
    const fallT = Math.max(0, Math.min(1, (inside - 5) / 7));
    const rise = riseT * riseT * (3 - 2 * riseT), fall = 1 - fallT * fallT * (3 - 2 * fallT);
    const slope = 2 * riseT * (1 - riseT) * fall - rise * 6 * fallT * (1 - fallT) / 7;
    const angle = crownXPosition / hx * 2.2 + crownYPosition / hy * 1.4 - current;
    const crest = .6 + .4 * Math.sin(angle), transfer = gain * rise * fall;
    gathered = transfer * crest;
    gatheredX = -nx * gain * slope * crest + transfer * .4 * Math.cos(angle) * 2.2 / hx;
    gatheredY = -ny * gain * slope * crest + transfer * .4 * Math.cos(angle) * 1.4 / hy;
  }
  let transported = 0, transportedX = 0, transportedY = 0, withdrawn = 0, withdrawnX = 0, withdrawnY = 0;
  if (folder && transfer) {
    // Authored redistribution inside the existing volume. Compact finite
    // support stays on the control row; it is not a colored connecting mesh.
    const packetX = x - transfer.point.x, packetY = y - transfer.point.y;
    const sourceX = x - transfer.source.x, sourceY = y - transfer.source.y;
    const packet = Math.max(0, 1 - (packetX / 32) ** 2 - (packetY / 14) ** 2);
    const source = Math.max(0, 1 - (sourceX / 12) ** 2 - (sourceY / 28) ** 2);
    transported = transfer.flow * packet ** 3 * coverage;
    transportedX = transfer.flow * (-6 * packetX / 32 ** 2 * packet ** 2 * coverage + packet ** 3 * slope * nx);
    transportedY = transfer.flow * (-6 * packetY / 14 ** 2 * packet ** 2 * coverage + packet ** 3 * slope * ny);
    withdrawn = transfer.borrowed * source ** 3 * coverage;
    withdrawnX = transfer.borrowed * (-6 * sourceX / 12 ** 2 * source ** 2 * coverage + source ** 3 * slope * nx);
    withdrawnY = transfer.borrowed * (-6 * sourceY / 28 ** 2 * source ** 2 * coverage + source ** 3 * slope * ny);
  }
  if (detail) detail.gather = Math.min(1, gathered + transported * .75);
  const bulk = 4.4 + 2 * crown;
  const gradient = bulk * slope * amount - .32 * donorSlope * flow;
  return { height: bulk * coverage * amount - .32 * donor * flow + (1.35 * gathered + 1.8 * transported - .9 * withdrawn) * amount,
    dx: gradient * nx + 2 * coverage * amount * crownX + (1.35 * gatheredX + 1.8 * transportedX - .9 * withdrawnX) * amount,
    dy: gradient * ny + 2 * coverage * amount * crownY + (1.35 * gatheredY + 1.8 * transportedY - .9 * withdrawnY) * amount,
    pigment: (.12 * coverage * coverage + .018 * gathered + .04 * transported - .015 * withdrawn) * amount };
}

// xy: height gradient, z: relief, w: spectral clearing concentration.
export const DENSITY_GLSL = `
vec3 jellyRoundedField(vec2 p, vec2 size, float radius) {
  vec2 q = abs(p) - size * .5 + radius;
  vec2 outside = max(q, 0.0);
  float len = length(outside);
  float d = len + min(max(q.x, q.y), 0.0) - radius;
  vec2 n = (len > .0001 ? outside / len : (q.x > q.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0))) * sign(p);
  return vec3(d, n);
}
vec4 jellyDensityField(vec2 point, vec4 region, float amount, vec4 shape, float jiggle, vec2 hover, vec4 transport, vec4 donorTransport, out float gathered) {
  gathered = 0.0;
  vec2 p = point - region.xy;
  if ((amount <= .001 && abs(shape.y) <= .001) || any(greaterThan(abs(p),region.zw*.5+vec2(80.0)))) return vec4(0.0);
  float radius = min(32.0, min(region.z, region.w) * .5);
  vec3 field = jellyRoundedField(p, region.zw, radius);
  vec2 crownPoint=p, crownSize=region.zw;
  if (shape.w > .5) {
    float phase = clamp(shape.z,0.0,1.0);
    float tabWidth = min(${FOLDER_DENSITY.width.toFixed(1)},region.z), tabHeight = ${FOLDER_DENSITY.handleHeight.toFixed(1)};
    float reach = 1.0-pow(1.0-phase,1.6);
    float shoulderPhase = clamp((phase-.2)/.8,0.0,1.0);
    float shoulder = ${FOLDER_DENSITY.shoulder.toFixed(1)}*shoulderPhase*shoulderPhase*(3.0-2.0*shoulderPhase);
    float restWidth = mix(tabWidth,region.z,reach);
    float stretch = 6.0*clamp(jiggle,-1.0,1.0)*(1.0-.65*phase);
    float bodyWidth = restWidth+stretch, wholeHeight = mix(tabHeight,region.w,phase)/(1.0+stretch/restWidth);
    float looseness = sin(3.14159265359*phase);
    float corner = ${FOLDER_DENSITY.radius.toFixed(1)}+16.0*looseness+3.0*looseness*looseness*sin(9.42477796077*phase);
    float join = ${FOLDER_DENSITY.join.toFixed(1)}+12.0*looseness;
    float bodyHeight = wholeHeight-shoulder;
    float bx = p.x+region.z*.5-bodyWidth*.5;
    vec3 tab = jellyRoundedField(p+vec2(region.z*.5-tabWidth*.5,-region.w*.5+tabHeight*.5),vec2(tabWidth,tabHeight),${FOLDER_DENSITY.radius.toFixed(1)});
    vec3 body = jellyRoundedField(vec2(bx,p.y-region.w*.5+shoulder+bodyHeight*.5),vec2(bodyWidth,bodyHeight),min(corner,bodyHeight*.5));
    float blend = clamp(.5+.5*(tab.x-body.x)/join,0.0,1.0);
    vec3 joined = mix(tab,body,blend);
    joined.x -= join*blend*(1.0-blend);
    vec3 envelope = jellyRoundedField(vec2(bx,p.y-region.w*.5+wholeHeight*.5),vec2(bodyWidth,wholeHeight),min(corner,wholeHeight*.5));
    if (envelope.x > joined.x) joined = envelope;
    field = joined;
    crownPoint = vec2(bx,p.y-region.w*.5+wholeHeight*.5); crownSize = vec2(bodyWidth,wholeHeight);
    crownPoint.x -= clamp(jiggle,-.24,.24)*crownSize.x*.75;
  }
  float d = field.x;
  vec2 n = field.yz;
  float t = clamp((d + shape.x) / (shape.x * 2.0), 0.0, 1.0);
  float coverage = 1.0 - t*t*t*(t*(t*6.0-15.0)+10.0);
  float slope = -30.0*t*t*(t-1.0)*(t-1.0)/(shape.x*2.0);
  float u = clamp((d+24.0)/80.0, 0.0, 1.0);
  float surround = 1.0-u*u*u*(u*(u*6.0-15.0)+10.0);
  float donor = max(0.0, surround-coverage);
  float donorSlope = donor > 0.0 ? -30.0*u*u*(u-1.0)*(u-1.0)/80.0-slope : 0.0;
  vec2 halfSize = crownSize*.5;
  vec2 c = max(vec2(0.0), vec2(1.0) - (crownPoint/halfSize)*(crownPoint/halfSize));
  float crown = c.x*c.x*c.y*c.y;
  vec2 crownGradient = -4.0*crownPoint/(halfSize*halfSize)*vec2(c.x*c.y*c.y, c.y*c.x*c.x);
  vec2 gatheredGradient = vec2(0.0);
  if (shape.w > .5 && hover.x > .00001) {
    float gain = clamp(hover.x,0.0,1.0), inside = -d;
    float riseT = clamp(inside/3.0,0.0,1.0), fallT = clamp((inside-5.0)/7.0,0.0,1.0);
    float rise = riseT*riseT*(3.0-2.0*riseT), fall = 1.0-fallT*fallT*(3.0-2.0*fallT);
    float slope = 2.0*riseT*(1.0-riseT)*fall-rise*6.0*fallT*(1.0-fallT)/7.0;
    float angle = crownPoint.x/halfSize.x*2.2+crownPoint.y/halfSize.y*1.4-hover.y;
    float crest = .6+.4*sin(angle), transfer = gain*rise*fall;
    gathered = transfer*crest;
    gatheredGradient = -n*gain*slope*crest+transfer*.4*cos(angle)*vec2(2.2,1.4)/halfSize;
  }
  float transported = 0.0, withdrawn = 0.0;
  vec2 transportedGradient = vec2(0.0), withdrawnGradient = vec2(0.0);
  if (shape.w > .5 && (transport.z > .00001 || donorTransport.z > .00001)) {
    vec2 packetPoint = p-transport.xy, sourcePoint = p-donorTransport.xy;
    float packet = max(0.0,1.0-dot(packetPoint/vec2(32.0,14.0),packetPoint/vec2(32.0,14.0)));
    float source = max(0.0,1.0-dot(sourcePoint/vec2(12.0,28.0),sourcePoint/vec2(12.0,28.0)));
    transported = transport.z*packet*packet*packet*coverage;
    withdrawn = donorTransport.z*source*source*source*coverage;
    transportedGradient = transport.z*(-6.0*packetPoint/vec2(1024.0,196.0)*packet*packet*coverage+packet*packet*packet*slope*n);
    withdrawnGradient = donorTransport.z*(-6.0*sourcePoint/vec2(144.0,784.0)*source*source*coverage+source*source*source*slope*n);
  }
  float materialGather = gathered;
  gathered = min(1.0,gathered+transported*.75);
  float bulk = 4.4+2.0*crown;
  float gradient = bulk*slope*amount-.32*donorSlope*shape.y;
  return vec4(n*gradient+2.0*coverage*amount*crownGradient+(1.35*gatheredGradient+1.8*transportedGradient-.9*withdrawnGradient)*amount,
    bulk*coverage*amount-.32*donor*shape.y+(1.35*materialGather+1.8*transported-.9*withdrawn)*amount,
    (.12*coverage*coverage+.018*materialGather+.04*transported-.015*withdrawn)*amount);
}
vec4 jellyDensityField(vec2 point, vec4 region, float amount, vec4 shape, float jiggle, vec2 hover, out float gathered) {
  return jellyDensityField(point,region,amount,shape,jiggle,hover,vec4(0.0),vec4(0.0),gathered);
}
vec4 jellyDensity(vec2 point, vec4 region, float amount, vec4 shape, float jiggle, vec2 hover, vec4 transport, vec4 donorTransport) {
  float gathered;
  return jellyDensityField(point,region,amount,shape,jiggle,hover,transport,donorTransport,gathered);
}
vec4 jellyDensity(vec2 point, vec4 region, float amount, vec4 shape, float jiggle, vec2 hover) {
  float gathered;
  return jellyDensityField(point,region,amount,shape,jiggle,hover,gathered);
}
vec4 jellyDensity(vec2 point, vec4 region, float amount, vec4 shape, float jiggle) {
  return jellyDensity(point,region,amount,shape,jiggle,vec2(0.0));
}
float jellyDensityColorWeight(float concentration) {
  return clamp(concentration / .10, 0.0, 1.0);
}
float jellyDensityBackgroundTransmission(float concentration) {
  float c = clamp(concentration / .12, 0.0, 1.0);
  return 1.0 - .82 * c * c * (3.0 - 2.0 * c);
}
float jellyDensityAttenuation(float concentration, float amount) {
  if (amount <= 0.0 || concentration <= 0.0) return 1.0;
  float c = clamp(sqrt(concentration/(.12*amount)), 0.0, 1.0);
  float boundary = 16.0*c*c*(1.0-c)*(1.0-c);
  return 1.0-amount*(.54*c+.10*boundary);
}
`;

// Relative clearing preserves the parent pigment's live Spectral sample.
// A zero-concentration sample has no effect, including black/zero channels.
export function densityClearing(origin, tint) {
  return tint.map((channel, i) => channel - origin[i]);
}


// Disclosure phase is sampled from the same CSS clock as the grid reveal.
// Signed flow borrows/returns a shallow shoulder; the reading plateau is fixed.
export function densityPresentation(phase, flow) {
  const p = Math.max(0, Math.min(1, phase));
  return { amount: .88 + .06 * p, edge: 6 - p, fold: p,
    flow: p === 0 || p === 1 || Math.abs(flow) < .0001 ? 0 : Math.max(-1, Math.min(1, flow)) * Math.sin(Math.PI * p) };
}


// Bulk absorption grows monotonically into the interior. The narrow
// compression shoulder adds definition without becoming the densest feature.
export function densityAttenuation(concentration, amount) {
  if (amount <= 0 || concentration <= 0) return 1;
  const c = Math.max(0, Math.min(1, Math.sqrt(concentration / (.12 * amount))));
  const boundary = 16 * c * c * (1 - c) ** 2;
  return 1 - amount * (.54 * c + .10 * boundary);
}

// Authored legibility policy: density filters background casts/caustics.
// The material's own light-catching shoulder remains, and zero is identity.
export function densityBackgroundTransmission(concentration) {
  const c = Math.max(0, Math.min(1, concentration / .12));
  return 1 - .82 * c * c * (3 - 2 * c);
}

// A fully concentrated area owns the neutral group pigment, independent of
// its parent's accent. The surrounding film retains exact color identity.
export function densityColorWeight(concentration) {
  return Math.max(0, Math.min(1, concentration / .10));
}
