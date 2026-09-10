from pathlib import Path
import subprocess
import json
import hashlib
import sys
import os
import numpy as np

root = Path(__file__).parent
ffmpeg = os.environ.get('FFMPEG_PATH', 'ffmpeg')
movie = Path(sys.argv[1]) if len(sys.argv)>1 else root/'output/Maison-Martin_60s_Full-HD.mp4'
(root/'output').mkdir(exist_ok=True)
check = subprocess.run([str(ffmpeg),'-hide_banner','-i',str(movie),'-map','0:v','-map','0:a','-progress','pipe:1','-f','null','-'],capture_output=True,text=True,encoding='utf-8',errors='replace',check=True)
(root/'output/decode-verification.txt').write_text(check.stderr+'\n'+check.stdout,encoding='utf-8',newline='\n')
progress = dict(line.split('=',1) for line in check.stdout.splitlines() if '=' in line)
assert int(progress['frame']) == 1800, progress
assert '1920x1080' in check.stderr, check.stderr
assert '30 fps' in check.stderr, check.stderr
assert 'Audio: aac' in check.stderr, check.stderr
raw = subprocess.run([str(ffmpeg),'-v','error','-ss','56','-i',str(movie),'-an','-vf','scale=480:270','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],capture_output=True,check=True).stdout
frames = np.frombuffer(raw,np.uint8).reshape(-1,270,480,3)
assert len(frames)==120,len(frames)
delta = np.abs(frames[1:].astype(np.float32)-frames[:-1].astype(np.float32)).mean(axis=(1,2,3))
assert float(delta.max())<.15, delta.max()
qa = {'file':str(movie),'duration_seconds':60,'video_frames':1800,'size_pixels':[1920,1080],'fps':30,'audio':'AAC stereo 48 kHz','full_decode':'passed','stable_ending_seconds':4,'last_segment_frames':len(frames),'maximum_mean_pixel_change_ending':float(delta.max()),'sha256':hashlib.sha256(movie.read_bytes()).hexdigest(),'bytes':movie.stat().st_size}
(root/'output/verification.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(qa,ensure_ascii=False,indent=2))
for t in [8.7,16.7,24.5,30.8,34,36.8,41.8,46,51.8,57]:
    subprocess.run([str(ffmpeg),'-v','error','-y','-ss',str(t),'-i',str(movie),'-frames:v','1',str(root/f'output/encoded-{t}.png')],check=True)
print('Images extraites du MP4 pour contrôle visuel.')
