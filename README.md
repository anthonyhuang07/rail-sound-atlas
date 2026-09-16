# Rail Sound Atlas

An interactive atlas for the sounds of rail systems across the world!

### Sound sharing
Each recording's link button copies `/sound/<sound_files.id>`. The Pages Function
in `functions/sound/[id].js` provides sound-specific Open Graph previews and sends
browser visitors to the recording's system, line, and expanded card. Shared links
highlight the recording without autoplaying it, including historical recordings.

Deploy through Cloudflare Pages Git integration with this repository as the root
and its root as the static output directory. Set `SUPABASE_URL` and
`SUPABASE_ANON_KEY` (publishable key) as Pages environment variables, then redeploy.
The database must allow public reads of `sound_files`, `sounds`, `systems`, and
`stations`, as the website already requires. No schema change is needed.
Ordinary static local servers do not execute the `/sound/*` Pages Function.

### Credits
All sounds are credited on the website. Please contact me directly if you would like to have a sound taken down.
