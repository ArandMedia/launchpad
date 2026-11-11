import SectionHeader from "../section-header";
import JournalWorkspace from "./journal-workspace";

export default function JournalPage() {
  return <>
    <SectionHeader eyebrow="Private writing" title="Journal & Notes" description="Write with the keyboard or Apple Pencil, preserve freehand ink, and search your private entries by words, title, tags, type, or date." />
    <JournalWorkspace />
  </>;
}
