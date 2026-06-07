const MAX_PHASE_RAD = 2 * Math.PI;

/** sin(ωt + φ), φ ∈ [0, 2π] — эквивалент sin/cos смеси через PeriodicWave. */
export function randomPhaseWave(oscillator: OscillatorNode, context: AudioContext): void {
  const phase = Math.random() * MAX_PHASE_RAD;
  const real = new Float32Array(2);
  const imag = new Float32Array(2);
  real[1] = Math.sin(phase);
  imag[1] = Math.cos(phase);
  oscillator.setPeriodicWave(context.createPeriodicWave(real, imag));
}
