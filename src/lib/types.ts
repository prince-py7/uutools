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
  /** Section belongs to a specific semester of the class. */
  semester_id: string | null;
  name: string;
};

export type Semester = {
  id: string;
  class_id: string;
  name: string;
  sort_order: number;
};

export type Subject = {
  id: string;
  class_id: string;
  semester_id: string | null;
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
  /** Current semester for class → semester → section directory. */
  semester_id: string | null;
  /** Student college / enrollment ID (roll number), not the colleges.id UUID. */
  enrollment_id: string | null;
  socials: Socials;
  is_admin: boolean;
  is_disabled: boolean;
  onboarding_complete: boolean;
  last_verification_sent_at?: string | null;
};

/** Built-in + admin-defined class roles (slug keys). */
export type ClassRoleKey =
  | "cr"
  | "professor"
  | "moderator"
  | "coordinator"
  | "assistant"
  | (string & {});

export type ClassRole = {
  id: string;
  user_id: string;
  class_id: string;
  section_id: string | null;
  role: ClassRoleKey;
};

export type RoleDefinition = {
  id: string;
  college_id: string;
  role_key: string;
  label: string;
  created_at?: string;
};

export type TeacherDelegation = {
  id: string;
  college_id: string;
  teacher_id: string;
  granted_by: string;
  can_manage_subjects: boolean;
  can_post_official: boolean;
  is_active: boolean;
  created_at?: string;
};

export type StudyType =
  | "unit"
  | "assignment"
  | "practical"
  | "whiteboard"
  | "other";
export type PostKind = "social" | "study";
export type MediaType = "image" | "pdf" | "video" | "none";

export type Post = {
  id: string;
  author_id: string;
  college_id: string;
  class_id: string | null;
  section_id: string | null;
  semester_id: string | null;
  kind: PostKind;
  study_type: StudyType | null;
  subject_id: string | null;
  /** Unit label for study material, e.g. "Unit 1". */
  study_unit: string | null;
  /** Academic year the material was given, e.g. "2024-25". */
  academic_year: string | null;
  caption: string;
  media_url: string | null;
  /** Original upload filename, e.g. "DBMS_Unit1.pdf". */
  media_name: string | null;
  media_type: MediaType | null;
  like_count: number;
  comment_count: number;
  share_count: number;
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

export type TimetableTemplate = {
  id: string;
  college_id: string;
  class_id: string;
  semester_id: string;
  section_id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TimetableTemplateSlot = {
  id: string;
  template_id: string;
  day_of_week: number;
  slot: number;
  subject_text: string;
};

export type Story = {
  id: string;
  author_id: string;
  college_id: string;
  class_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string;
  created_at: string;
  expires_at: string;
};

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

export type FriendRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  media_url: string | null;
  media_type: "image" | "audio" | null;
  read_at: string | null;
  created_at: string;
};

export type BadgeKind =
  | "admin"
  | "developer"
  | "professor"
  | "cr"
  | "moderator"
  | "coordinator"
  | "assistant"
  | "verified"
  | "unitians_popular";

export type Badge = {
  kind: BadgeKind;
  label: string;
};

export type FeedFilters = {
  studyOnly: boolean;
  classOnly: boolean;
  verifiedOnly: boolean;
  classId: string | null;
  sectionId: string | null;
  semesterId: string | null;
  subjectId: string | null;
  studyType: StudyType | null;
  academicYear: string | null;
  studyUnit: string | null;
};

export type NotificationType =
  | "class_announcement"
  | "system"
  | "friend_request"
  | "friend_accepted";

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  ref_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type ClassAnnouncement = {
  id: string;
  class_id: string;
  section_id: string | null;
  author_id: string;
  body: string;
  image_url: string | null;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};
