#!/bin/bash

# Launch EchoVanish
echo "Launching EchoVanish..."
jules --config dsp-blueprints/agents/AGENTS_EchoVanish.md --file dsp-blueprints/EchoVanish.md &

# Launch PlosiveGuard
echo "Launching PlosiveGuard..."
jules --config dsp-blueprints/agents/AGENTS_PlosiveGuard.md --file dsp-blueprints/PlosiveGuard.md &

# Launch SpectralMatch
echo "Launching SpectralMatch..."
jules --config dsp-blueprints/agents/AGENTS_SpectralMatch.md --file dsp-blueprints/SpectralMatch.md &

# Launch DeBleedLite
echo "Launching DeBleedLite..."
jules --config dsp-blueprints/agents/AGENTS_DeBleedLite.md --file dsp-blueprints/DeBleedLite.md &

# Launch TapeStabilizer
echo "Launching TapeStabilizer..."
jules --config dsp-blueprints/agents/AGENTS_TapeStabilizer.md --file dsp-blueprints/TapeStabilizer.md &

# Launch SmartLevel
echo "Launching SmartLevel..."
jules --config dsp-blueprints/agents/AGENTS_SmartLevel.md --file dsp-blueprints/SmartLevel.md &

# Launch PsychoDynamicEQ
echo "Launching PsychoDynamicEQ..."
jules --config dsp-blueprints/agents/AGENTS_PsychoDynamicEQ.md --file dsp-blueprints/PsychoDynamicEQ.md &

# Launch VoiceIsolate
echo "Launching VoiceIsolate..."
jules --config dsp-blueprints/agents/AGENTS_VoiceIsolate.md --file dsp-blueprints/VoiceIsolate.md &

# Launch StereoExpanse
echo "Launching StereoExpanse..."
jules --config dsp-blueprints/agents/AGENTS_StereoExpanse.md --file dsp-blueprints/StereoExpanse.md &

echo "All tasks initiated (check background processes)."
