export interface CardData { online: number; visits: number; origin: string }

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en')} ${n === 1 ? one : many}`

export function card({ online, visits, origin }: CardData): string {
  return `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#fff2dc;font-family:'Arial Black','Helvetica Neue',Arial,sans-serif;color:#14110f;position:relative}
.bg{position:absolute;inset:0;background:url(${origin}/hero.jpg) center/cover;mix-blend-mode:multiply}
.num{position:absolute;top:70px;left:0;right:0;text-align:center;font-size:330px;font-weight:900;letter-spacing:-.04em;line-height:1;display:flex;justify-content:center;gap:8px}
.num span{-webkit-text-stroke:14px #14110f;paint-order:stroke fill;text-shadow:14px 14px 0 #14110f}
.num span:nth-child(1){color:#ff7a00;transform:rotate(-4deg) translateY(6px)}
.num span:nth-child(2){color:#18a5bf;transform:translateY(-14px)}
.num span:nth-child(3){color:#ff3d8b;transform:rotate(4deg) translateY(6px)}
.tag{position:absolute;bottom:128px;left:50%;transform:translateX(-50%) rotate(-1.5deg);background:#14110f;color:#fff2dc;padding:16px 36px 16px 46px;font-size:26px;letter-spacing:.5em;white-space:nowrap;border:3px solid #fff2dc}
.pill{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);white-space:nowrap;background:#fff2dc;border:4px solid #14110f;box-shadow:8px 8px 0 #ff3d8b;padding:12px 28px;font-size:26px;letter-spacing:.08em}
.dot{display:inline-block;width:18px;height:18px;border-radius:50%;margin-right:14px;background:${online ? '#18a5bf' : '#9a9088'};border:3px solid #14110f}
</style><div class="bg"></div>
<div class="num"><span>2</span><span>7</span><span>1</span></div>
<div class="tag">TWO · SEVEN · ONE · AGAIN</div>
<div class="pill"><span class="dot"></span>${plural(online, 'rider', 'riders')} in the tunnel now · ${plural(visits, 'visit', 'visits')}</div>`
}
