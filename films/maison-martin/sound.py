from pathlib import Path
import wave
import numpy as np

# Habillage original : nappes légères, notes espacées et contacts doux.
root = Path(__file__).parent
sr = 48000
sound = np.zeros((60 * sr, 2), dtype=np.float64)
rng = np.random.default_rng(17)

def add(at, data, pan=0):
    start = int(at * sr)
    count = min(len(data), len(sound) - start)
    sound[start:start+count, 0] += data[:count] * np.sqrt((1-pan)/2)
    sound[start:start+count, 1] += data[:count] * np.sqrt((1+pan)/2)

for at, notes in [(0,[146.83,220,329.63]),(7,[130.81,196,293.66]),(14,[146.83,220,329.63]),(22,[164.81,220,293.66]),(30,[146.83,220,311.13]),(40,[130.81,196,293.66]),(49,[146.83,220,329.63])]:
    t = np.arange(11*sr)/sr
    env = (1-np.exp(-t/1.8))*np.exp(-t/3.4)
    for i, hz in enumerate(notes):
        sig = (np.sin(2*np.pi*hz*t) + .21*np.sin(2*np.pi*hz*2*t+.2)) * env * .013
        add(at, sig, (i-1)*.35)

for at, hz in [(1.1,440),(6.5,587.33),(11,659.25),(18.1,440),(20.8,587.33),(22.2,659.25),(26.7,440),(29.2,587.33),(41.7,523.25),(53.3,587.33),(55.1,440)]:
    t = np.arange(int(3.5*sr))/sr
    env = (1-np.exp(-t/.015))*np.exp(-t/.68)
    add(at, (np.sin(2*np.pi*hz*t)+.08*np.sin(2*np.pi*hz*2.003*t))*env*.026, .1)

for at in [10.75,15.3,19.5,21,25.2,27.1,34.9]:
    t = np.arange(int(.17*sr))/sr
    sig = rng.normal(0,1,len(t))
    sig = np.convolve(sig,np.ones(30)/30,mode='same')
    add(at,sig*np.exp(-t/.027)*.017)

fade = np.clip(np.arange(len(sound))/(sr*1.2),0,1)
fade *= np.clip((len(sound)-1-np.arange(len(sound)))/(sr*1.7),0,1)
sound *= fade[:,None]
data = np.clip(sound,-1,1)
with wave.open(str(root/'sound.wav'),'wb') as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(sr)
    f.writeframes((data*32767).astype('<i2').tobytes())
print(f'Habillage original : 60 s, crête {20*np.log10(np.max(np.abs(data))):.1f} dBFS')
