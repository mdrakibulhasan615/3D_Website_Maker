import { redirect } from "next/navigation";

/** "/" → "/editor". Later this becomes the project dashboard. */
export default function Home() {
  redirect("/editor");
}
