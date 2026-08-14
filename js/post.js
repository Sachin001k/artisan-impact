import { supabase } from './supabaseClient.js'

const shell = document.getElementById('postShell')
const params = new URLSearchParams(location.search)
const slug = params.get('slug')

async function init() {
  if (!slug) {
    shell.innerHTML = `<p>No diary entry specified.</p>`
    return
  }

  const { data: post, error } = await supabase
    .from('posts')
    .select('*, artists(*)')
    .eq('slug', slug)
    .single()

  if (error || !post) {
    shell.innerHTML = `<p>Couldn't find that diary entry.</p>`
    console.error(error)
    return
  }

  document.title = `${post.title} — Artisan Impact`

  const paragraphs = post.content
    .split('\n\n')
    .map((p) => `<p style="margin-top:16px; color:rgba(27,38,32,0.8); font-size:1.05rem;">${p}</p>`)
    .join('')

  shell.innerHTML = `
    <div class="eyebrow">Art Diaries</div>
    <h1 style="font-size:clamp(1.8rem,3.6vw,2.6rem); margin-bottom:20px;">${post.title}</h1>
    <div class="ba-cell" style="height:220px; border-radius:14px; margin-bottom:10px; background:linear-gradient(135deg, ${post.gradient_from}, ${post.gradient_to});"></div>
    ${paragraphs}
    ${
      post.artists
        ? `<p style="margin-top:30px;"><a href="artist.html?id=${post.artists.id}" class="btn btn-dark">More about ${post.artists.name} →</a></p>`
        : ''
    }
    <p style="margin-top:40px;"><a href="index.html#stories" class="btn btn-ghost" style="border-color:var(--ink); color:var(--ink);">← Back to Art Diaries</a></p>
  `
}

init()
