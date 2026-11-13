/**
 * RSVP form schema shared by the admin form builder and the guest RSVP page.
 * Every new setting is optional with a default that reproduces how forms
 * saved before it existed already behaved.
 */

export type RsvpCustomFieldType =
  | 'text'
  | 'textarea'
  | 'radio'
  | 'checkbox'
  | 'select'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'section';

export type RsvpFieldMode = 'required' | 'optional' | 'hidden';
export type RsvpShowWhen = 'always' | 'yes' | 'no';

export type RsvpCustomField = {
  id: string;
  label: string;
  description: string;
  type: RsvpCustomFieldType;
  required: boolean;
  placeholder: string;
  options: string[];
  showWhen: RsvpShowWhen;
};

export type RsvpFormSettings = {
  formTitle: string;
  formDescription: string;
  guestNameLabel: string;
  guestNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailMode: RsvpFieldMode;
  phoneLabel: string;
  phonePlaceholder: string;
  phoneMode: RsvpFieldMode;
  attendanceEnabled: boolean;
  isInvalidated: boolean;
  attendanceLabel: string;
  attendanceYesLabel: string;
  attendanceNoLabel: string;
  commentsEnabled: boolean;
  commentsLabel: string;
  commentsPlaceholder: string;
  plusOnesEnabled: boolean;
  plusOnesMax: number;
  plusOnesLabel: string;
  submitLabel: string;
  /** Event-level default. When set, every RSVP link for this event
   *  forwards to this URL instead of the built-in form. */
  externalFormUrl: string;
  customFields: RsvpCustomField[];
};

export const MAX_PLUS_ONES = 10;

export const FIELD_TYPES: Array<{ value: RsvpCustomFieldType; label: string; icon: string }> = [
  { value: 'text', label: 'Short answer', icon: 'mdi:text-short' },
  { value: 'textarea', label: 'Paragraph', icon: 'mdi:text-long' },
  { value: 'radio', label: 'Multiple choice', icon: 'mdi:radiobox-marked' },
  { value: 'checkbox', label: 'Checkboxes', icon: 'mdi:checkbox-marked-outline' },
  { value: 'select', label: 'Dropdown', icon: 'mdi:arrow-down-drop-circle-outline' },
  { value: 'number', label: 'Number', icon: 'mdi:numeric' },
  { value: 'email', label: 'Email', icon: 'mdi:email-outline' },
  { value: 'phone', label: 'Phone number', icon: 'mdi:phone-outline' },
  { value: 'date', label: 'Date', icon: 'mdi:calendar-outline' },
  { value: 'time', label: 'Time', icon: 'mdi:clock-outline' },
  { value: 'section', label: 'Title & description', icon: 'mdi:format-title' },
];

const FIELD_TYPE_SET = new Set<RsvpCustomFieldType>(FIELD_TYPES.map((t) => t.value));
const MODES = new Set<RsvpFieldMode>(['required', 'optional', 'hidden']);

export const fieldNeedsOptions = (type: RsvpCustomFieldType) =>
  type === 'select' || type === 'radio' || type === 'checkbox';

export const defaultRsvpFormSettings: RsvpFormSettings = {
  formTitle: '',
  formDescription: '',
  guestNameLabel: 'Guest Name',
  guestNamePlaceholder: '',
  emailLabel: 'Email',
  emailPlaceholder: '',
  emailMode: 'optional',
  phoneLabel: 'Phone Number',
  phonePlaceholder: '',
  phoneMode: 'required',
  attendanceEnabled: true,
  isInvalidated: false,
  attendanceLabel: 'Will you attend?',
  attendanceYesLabel: 'YES, I WILL ATTEND',
  attendanceNoLabel: 'UNABLE TO ATTEND',
  commentsEnabled: true,
  commentsLabel: 'Additional Comments',
  commentsPlaceholder: '',
  plusOnesEnabled: false,
  plusOnesMax: 1,
  plusOnesLabel: 'Will anyone be coming with you?',
  submitLabel: 'Submit',
  externalFormUrl: '',
  customFields: [],
};

export const createFieldId = () =>
  globalThis.crypto && 'randomUUID' in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `form_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const createEmptyField = (type: RsvpCustomFieldType = 'text'): RsvpCustomField => ({
  id: createFieldId(),
  label: '',
  description: '',
  type,
  required: false,
  placeholder: '',
  options: fieldNeedsOptions(type) ? ['Option 1'] : [],
  showWhen: 'always',
});

const str = (value: any) => (typeof value === 'string' ? value : '');

export const normalizeCustomField = (field: any, index: number): RsvpCustomField => {
  const type: RsvpCustomFieldType = FIELD_TYPE_SET.has(field?.type) ? field.type : 'text';
  return {
    id: str(field?.id).trim() || `custom_field_${index + 1}`,
    label: str(field?.label).trim() || (type === 'section' ? '' : `Question ${index + 1}`),
    description: str(field?.description),
    type,
    required: type !== 'section' && field?.required === true,
    placeholder: str(field?.placeholder),
    options: Array.isArray(field?.options)
      ? field.options.map((option: any) => String(option ?? '').trim()).filter(Boolean)
      : [],
    showWhen: field?.showWhen === 'yes' || field?.showWhen === 'no' ? field.showWhen : 'always',
  };
};

export const normalizeRsvpFormSettings = (settings: any): RsvpFormSettings => {
  const s = settings && typeof settings === 'object' ? settings : {};
  const max = Number.parseInt(String(s.plusOnesMax ?? ''), 10);
  return {
    ...defaultRsvpFormSettings,
    ...s,
    formTitle: str(s.formTitle),
    formDescription: str(s.formDescription),
    emailMode: MODES.has(s.emailMode) ? s.emailMode : 'optional',
    phoneMode: MODES.has(s.phoneMode) ? s.phoneMode : 'required',
    attendanceEnabled: s.attendanceEnabled !== false,
    isInvalidated: s.isInvalidated === true,
    commentsEnabled: s.commentsEnabled !== false,
    plusOnesEnabled: s.plusOnesEnabled === true,
    plusOnesMax: Number.isFinite(max) ? Math.min(MAX_PLUS_ONES, Math.max(1, max)) : 1,
    plusOnesLabel: str(s.plusOnesLabel) || defaultRsvpFormSettings.plusOnesLabel,
    submitLabel: 'Submit',
    externalFormUrl: str(s.externalFormUrl).trim(),
    customFields: Array.isArray(s.customFields)
      ? s.customFields.map((field: any, index: number) => normalizeCustomField(field, index))
      : [],
  };
};

/** Whether a question applies given the guest's attendance answer. */
export const fieldIsVisible = (
  field: RsvpCustomField,
  attendanceEnabled: boolean,
  status: string
) => !attendanceEnabled || field.showWhen === 'always' || field.showWhen === status;
