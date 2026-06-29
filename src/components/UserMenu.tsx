import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Camera, LogOut, User as UserIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

type Profile = { id: string; nome: string; email: string | null; avatar_url: string | null };

export function UserMenu() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, nome, email, avatar_url")
      .eq("id", u.user.id)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  }

  useEffect(() => { load(); }, []);

  function resizeToDataUrl(file: File, max = 256): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;
    setUploading(true);
    try {
      const dataUrl = await resizeToDataUrl(file);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: dataUrl })
        .eq("id", profile.id);
      if (error) throw error;
      setProfile({ ...profile, avatar_url: dataUrl });
      toast.success("Foto atualizada");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (profile?.nome ?? "U")
    .split(" ").slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto gap-2 px-2 py-1">
            <Avatar className="h-8 w-8">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.nome} />}
              <AvatarFallback>{initials || <UserIcon className="h-4 w-4" />}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <div className="text-sm font-medium leading-tight">{profile?.nome ?? "..."}</div>
              {profile?.email && (
                <div className="text-[11px] text-muted-foreground leading-tight">{profile.email}</div>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{profile?.nome ?? "Usuário"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); inputRef.current?.click(); }}
            disabled={uploading}
          >
            <Camera className="mr-2 h-4 w-4" />
            {uploading ? "Enviando..." : "Alterar foto"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
