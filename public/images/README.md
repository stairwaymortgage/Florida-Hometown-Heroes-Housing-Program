# Images

Currently the HTML/CSS references the 7 brand images from the **live Elementor Cloud CDN**:
- `https://floridahometownheroeshousingprogram2026.com/wp-content/uploads/2025/10/<filename>`

This works fine immediately, but creates a dependency on the live WordPress site staying up.

## Before you migrate off Elementor Cloud, download these 7 files into this folder:

| Filename | Where used |
|---|---|
| `Hometown-Heroes.webp` | Home page hero (SEC#0 background) |
| `Bg11.jpg` | Home page Quick Facts section (background) |
| `Awaiting-2025-Hometown-Heroes.jpeg` | Home "What Is" inline image + Eligible/Income heading column bg |
| `Homebuyer-key.webp` | Home Interest Rates + Eligible School Staff + Income Highest Counties (backgrounds) |
| `Copy-of-22-UFCU-0622-FAMILY.jpg` | Eligible/Income/Contact page hero (background) |
| `Conventional-Loans-2.jpg` | Eligible First Responders + How to Apply (inline) + Income Understanding + Next Steps (inline) |
| `VA-Header-4-1.jpg` | Eligible First Responders + Full-Time Employment (inline) |

## How to download them

From your live WordPress dashboard:
1. Go to **Media → Library**
2. Search for each filename
3. Download the original file
4. Save into this `images/` folder with the exact filename above

OR via FTP/SSH:
```
scp -r user@your-elementor-cloud:/wp-content/uploads/2025/10/ ./images/
```

## After downloading

Run this find-and-replace in the project root to switch from live CDN to local files:

```bash
cd ..
sed -i 's|https://floridahometownheroeshousingprogram2026.com/wp-content/uploads/2025/10/|images/|g' *.html style.css
```

The Awaiting filename has an en-dash (`–`) in the original URL — already aliased to `Awaiting-2025-Hometown-Heroes.jpeg` in the code, so make sure your local copy uses this clean ASCII name.
