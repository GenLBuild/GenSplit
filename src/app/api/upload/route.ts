import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const fileName = `${Date.now()}-${file.name}`;
  const { error } = await supabase.storage
    .from("nft-images")
    .upload(fileName, file);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from("nft-images").getPublicUrl(fileName);
  return NextResponse.json({ url: data.publicUrl });
}