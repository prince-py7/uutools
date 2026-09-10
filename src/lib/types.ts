export type College = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export type ClassRow = {
  id: string;
  college_id: string;
  name: string;
};

export type Section = {
  id: string;
  class_id: string;
  name: string;
};

export type Subject = {
  id: string;
  class_id: string;
  name: string;
};

export type Socials = {
  instagram?: string;
  linkedin?: string;
  github?: string;
  website?: string;
};

export type Profile = {
  id: string;
  username: string;
  email: string;
  email_verified: boolean;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  college_id: string | null;
  class_id: string | null;
  section_id: string | null;
  socials: Socials;
  is_admin: boolean;
  is_disabled: boolean;
  onboarding_complete: boolean;
};

export type ClassRole = {
  id: string;
  user_id: string;
  class_id: string;
  section_id: string | null;
  role: "cr" | "professor";
};

export type StudyType = "unit" | "assignment" | "practical" | "whiteboard" | "other";
export type PostKind = "social" | "study";

export type Post = {
  id: string;
  author_id: string;
  college_id: string;
  class_id: string | null;
  section_id: string | null;
  kind: PostKind;
  study_type: StudyType | null;
  subject_id: string | null;
  caption: string;
  media_url: string | null;
  media_type: "image" | "pdf" | "none" | null;
  like_count: number;
  comment_count: number;
  is_official_verified: boolean;
  created_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type TimetableSlot = {
  id: string;
  user_id: string;
  day_of_week: number;
  slot: number;
  subject_text: string;
};

export type BadgeKind =
  | "developer"
  | "professor"
  | "cr"
  | "verified"
  | "unitians_popular";

export type Badge = {
  kind: BadgeKind;
  label: string;
};

export type FeedFilters = {
  studyOnly: boolean;
  verifiedOnly: boolean;
  classId: string | null;
  sectionId: string | null;
  subjectId: string | null;
  studyType: StudyType | null;
};
