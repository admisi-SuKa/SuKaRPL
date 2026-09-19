import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CourseManager } from "./course-manager";

export const metadata = { title: "Mata Kuliah & CPMK" };

export default async function CoursesPage() {
  const profile = await requireProfile(["prodi", "admin"]);
  const supabase = await createClient();
  const { data: courses } = await supabase.from("courses").select("id,code,name,credits,assessment_type").eq("program_id", profile.program_id!).eq("active", true).order("code");
  const courseIds = (courses || []).map((c) => c.id);
  let cpmks: any[] = [];
  if (courseIds.length) {
    const { data } = await supabase.from("cpmks").select("id,course_id,code,sort_order,description").in("course_id", courseIds).eq("active", true).order("sort_order");
    cpmks = data || [];
  }
  const rows = (courses || []).map((c) => ({ ...c, cpmks: cpmks.filter((cp) => cp.course_id === c.id) }));
  return <CourseManager courses={rows as any[]} />;
}
