import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUserOrNull } from "@/lib/auth";
import { CV_BUCKET, CV_SIGNED_URL_SECONDS } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

/** Redirects the owner to a short-lived signed URL. RLS hides other users' versions (404). */
export async function GET(request: NextRequest, { params }: RouteContext<"/cvs/versions/[id]/download">) {
  if (!(await getUserOrNull())) return NextResponse.redirect(new URL("/login", request.url));

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("resume_versions")
    .select("storage_path, file_name")
    .eq("id", id)
    .maybeSingle();
  const parsed = z.object({ storage_path: z.string(), file_name: z.string() }).safeParse(row);
  if (!parsed.success) return new NextResponse("Not found", { status: 404 });
  const version = parsed.data;

  const { data, error } = await supabase.storage
    .from(CV_BUCKET)
    .createSignedUrl(version.storage_path, CV_SIGNED_URL_SECONDS, { download: version.file_name });
  if (error) return new NextResponse("Could not create a download link", { status: 502 });

  return NextResponse.redirect(data.signedUrl);
}
