#!/bin/bash
cp AGENTS.md AGENTS.md.bak

dsps=("EchoVanish" "PlosiveGuard" "SpectralMatch" "DeBleedLite" "TapeStabilizer" "SmartLevel" "PsychoDynamicEQ" "VoiceIsolate" "StereoExpanse")

for dsp in "${dsps[@]}"; do
  echo "----------------------------------------"
  echo "Starting Jules task for $dsp..."
  cp "dsp-blueprints/agents/AGENTS_${dsp}.md" AGENTS.md
  # We give Jules a moment to ensure file system changes are reflected if needed, 
  # though jules new should be synchronous in its context capture.
  jules new "Implement the $dsp DSP module. Refer to dsp-blueprints/${dsp}.md for technical specifications and follow the instructions in AGENTS.md."
done

mv AGENTS.md.bak AGENTS.md
echo "----------------------------------------"
echo "All 9 Jules tasks have been initiated."
