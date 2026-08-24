# Happy Birthday, Upasana

A one-page birthday party. Open `index.html` over **localhost** (not as a file), because the camera only works on a local or HTTPS page.

## Run it

Double-click `run.command`, or from this folder:

```bash
./run.sh
```

That starts a local server and opens the site. Press Ctrl+C in the terminal to stop.

## How it goes

1. Tap **Come in** and allow camera + microphone.
2. Make an **O** with your lips and blow at the screen.
3. The 29 candles go out, and *Happy Birthday* plays.
4. Cut the cake.

If the camera is declined, tap the cake (or **Tap to blow**) instead. Spacebar also works.

Nothing from the camera is recorded or sent anywhere — it stays in this tab so the page can see a blow.

## The song

By default the page synthesises the Happy Birthday melody.

To use your own track, save a file you have the rights to as `song.mp3` in this folder.

## Deploy on Vercel

`index.html` is at the **repo root**. Import [the GitHub repo](https://github.com/akhilmishr13/happy-birthday-upasana) at [vercel.com/new](https://vercel.com/new):

- Framework Preset: **Other**
- Root Directory: leave empty
- Build Command: leave empty
- Output Directory: leave empty

