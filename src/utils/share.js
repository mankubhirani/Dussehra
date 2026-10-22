export const WISHES = [
  {
    en: 'May the arrow of truth pierce every darkness. Happy Dussehra!',
    hi: 'सत्य का बाण हर अंधकार को भेद दे। विजयादशमी की हार्दिक शुभकामनाएँ!',
  },
  {
    en: 'May your life be filled with courage, light and the victory of good over evil. Happy Vijayadashami!',
    hi: 'आपके जीवन में साहस, प्रकाश और बुराई पर अच्छाई की विजय बनी रहे। शुभ विजयादशमी!',
  },
  {
    en: 'Burn away ego, anger and doubt this Dussehra, and welcome peace and joy.',
    hi: 'इस दशहरे अहंकार, क्रोध और संशय को जलाएँ, और शांति व आनंद का स्वागत करें।',
  },
  {
    en: 'Wishing you and your family a Dussehra full of blessings, sweets and celebration. Jai Shri Ram!',
    hi: 'आपको और आपके परिवार को आशीर्वाद, मिठास और उत्सव से भरा दशहरा मुबारक। जय श्री राम!',
  },
]

// Uses the Web Share API when present, otherwise the clipboard, otherwise a hidden textarea.
export async function shareWish(wish = WISHES[0]) {
  const text = `${wish.hi}\n${wish.en}`
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Happy Dussehra', text })
      return 'shared'
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled'
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok ? 'copied' : 'failed'
    } catch {
      return 'failed'
    }
  }
}
