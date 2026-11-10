import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTeamSession } from "@/lib/current-session";
import { REFERENCE_PAGES } from "@/lib/reference";

export const dynamic = "force-dynamic";

// Serves a private reference page (e.g. /reference/creative-engineering).
// The page is a complete, self-contained HTML document stored in the
// database, so it is returned as-is rather than rendered inside the
// internal layout. Admin-only. Until content has been loaded -- or when
// ?upload=1 is passed -- this shows a small upload screen instead.

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

function shell(title: string, body: string, status = 200) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · LaunchPAD</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0e0d0b;color:#ece7da;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{width:100%;max-width:460px;display:flex;flex-direction:column;gap:16px}
h1{font-size:24px;line-height:1.2;margin:0}
p{margin:0;color:#a39a86}
a{color:#e5bf78}
label.pick{display:block;border:1px dashed #463f30;border-radius:8px;padding:28px 20px;text-align:center;background:#16140f;cursor:pointer}
label.pick:hover,label.pick:focus-within{border-color:#e5bf78}
label.pick b{display:block;color:#ece7da}
input[type=file]{position:absolute;opacity:0;width:1px;height:1px}
#msg{min-height:1.6em}
#msg.err{color:#f0a08c}
</style></head><body><main>${body}</main></body></html>`;
  return new NextResponse(html, { status, headers: HEADERS });
}

const BACK = `<p><a href="/">&larr; LaunchPAD projects</a></p>`;

export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const page = REFERENCE_PAGES[params.slug];
  if (!page) {
    return shell("Not found", `<h1>Page not found</h1><p>There is no reference page at this address.</p>${BACK}`, 404);
  }

  // Middleware already requires a team session for this path; this is the
  // admin check on top of it.
  const session = await getTeamSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  if (session.role !== "ADMIN") {
    return shell(page.title, `<h1>${page.title}</h1><p>This reference is private to the account owner.</p>${BACK}`, 403);
  }

  const wantsUpload = req.nextUrl.searchParams.get("upload") === "1";
  const doc = wantsUpload ? null : await db.referenceDoc.findUnique({ where: { slug: params.slug } });
  if (doc) return new NextResponse(doc.html, { headers: HEADERS });

  return shell(
    page.title,
    `<h1>${page.title}</h1>
<p>${wantsUpload ? "Choose a new reference file to replace the current one." : "This page has no content yet. Choose the reference .html file to load it."} It is stored privately in LaunchPAD and only an admin can open it.</p>
<label class="pick"><b>Choose the .html file</b><span>or drop it here</span><input id="file" type="file" accept=".html,text/html"></label>
<p id="msg" role="status"></p>
${BACK}
<script>
(function(){
  var input=document.getElementById('file'), msg=document.getElementById('msg'), box=input.parentNode;
  function say(t,err){msg.textContent=t;msg.className=err?'err':''}
  function send(file){
    if(!file)return;
    say('Uploading '+file.name+'…');
    file.text().then(function(text){
      return fetch(${JSON.stringify(`/api/reference/${params.slug}`)},{method:'PUT',headers:{'Content-Type':'text/html'},body:text});
    }).then(function(res){
      if(res.ok){say('Saved. Opening…');location.href=location.pathname;return}
      return res.json().catch(function(){return {}}).then(function(d){say(d.error||'Upload failed. Try again.',true)});
    }).catch(function(){say('Upload failed. Check your connection and try again.',true)});
  }
  input.addEventListener('change',function(){send(input.files[0])});
  box.addEventListener('dragover',function(e){e.preventDefault()});
  box.addEventListener('drop',function(e){e.preventDefault();send(e.dataTransfer.files[0])});
})();
</script>`
  );
}
