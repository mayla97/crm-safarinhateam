import { supabase } from "./client";

export const addTask = async (task: any) => {
  const { data, error } = await supabase
    .from("tasks")
    .insert(task)
    .select()
    .single();

  if (error) throw error;

  return data;
};