from PIL import Image,ImageDraw,ImageFilter
from pathlib import Path
root=Path(__file__).resolve().parents[1] / 'icons'
N=1024
im=Image.new('RGBA',(N,N),(0,0,0,0))
d=ImageDraw.Draw(im)
d.rounded_rectangle((28,28,996,996),radius=225,fill=(23,35,35,255))
d.rounded_rectangle((48,48,976,976),radius=208,outline=(65,89,82,255),width=14)
fruit=Image.new('RGBA',(N,N),(0,0,0,0));f=ImageDraw.Draw(fruit)
f.ellipse((282,255,725,848),fill=(255,190,50,255))
f.ellipse((327,302,686,816),fill=(255,162,38,255))
f.ellipse((357,336,449,510),fill=(255,216,101,155))
fruit=fruit.rotate(27,resample=Image.Resampling.BICUBIC)
im.alpha_composite(fruit)
d=ImageDraw.Draw(im)
d.line((520,285,557,190),fill=(175,222,101,255),width=34,joint='curve')
d.ellipse((540,170,567,197),fill=(175,222,101,255))
d.polygon([(553,206),(695,128),(755,175),(648,268)],fill=(193,246,105,255))
d.line((560,217,718,178),fill=(77,129,42,210),width=13)
for n in [16,32,48,128]:
 out=im.resize((n,n),Image.Resampling.LANCZOS)
 out.save(root/f'icon-{n}.png',optimize=True)
