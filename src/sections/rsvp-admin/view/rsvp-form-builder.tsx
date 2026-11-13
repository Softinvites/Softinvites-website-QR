import type { ReactNode } from 'react';
import type {
  RsvpFieldMode,
  RsvpShowWhen,
  RsvpCustomField,
  RsvpFormSettings,
  RsvpCustomFieldType,
} from 'src/utils/rsvp-form';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import {
  FIELD_TYPES,
  MAX_PLUS_ONES,
  createFieldId,
  createEmptyField,
  fieldNeedsOptions,
} from 'src/utils/rsvp-form';

import { Iconify } from 'src/components/iconify/iconify';

// Google Forms palette.
const G_PURPLE = '#673ab7';
const G_BLUE = '#4285f4';
const G_BG = '#f0ebf8';

type Props = {
  value: RsvpFormSettings;
  onChange: (updater: (prev: RsvpFormSettings) => RsvpFormSettings) => void;
  eventName?: string;
};

const MODE_OPTIONS: Array<{ value: RsvpFieldMode; label: string }> = [
  { value: 'required', label: 'Required' },
  { value: 'optional', label: 'Optional' },
  { value: 'hidden', label: 'Hidden (not asked)' },
];

const SHOW_WHEN_OPTIONS: Array<{ value: RsvpShowWhen; label: string }> = [
  { value: 'always', label: 'Everyone' },
  { value: 'yes', label: 'Only guests attending' },
  { value: 'no', label: 'Only guests not attending' },
];

function FormCard({
  children,
  active,
  top,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  top?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        bgcolor: '#fff',
        borderColor: '#dadce0',
        ...(top && { borderTop: `10px solid ${G_PURPLE}` }),
        ...(active && { borderLeft: `6px solid ${G_BLUE}`, boxShadow: 2 }),
      }}
    >
      {children}
    </Card>
  );
}

const optionIcon = (type: RsvpCustomFieldType) =>
  type === 'radio'
    ? 'mdi:radiobox-blank'
    : type === 'checkbox'
      ? 'mdi:checkbox-blank-outline'
      : 'mdi:numeric';

export function RsvpFormBuilder({ value, onChange, eventName }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const fields = value.customFields;

  const set = (patch: Partial<RsvpFormSettings>) => onChange((prev) => ({ ...prev, ...patch }));

  const updateField = (id: string, patch: Partial<RsvpCustomField>) =>
    onChange((prev) => ({
      ...prev,
      customFields: prev.customFields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));

  const addField = (type: RsvpCustomFieldType) => {
    const field = createEmptyField(type);
    onChange((prev) => {
      const index = prev.customFields.findIndex((f) => f.id === activeId);
      const next = [...prev.customFields];
      next.splice(index >= 0 ? index + 1 : next.length, 0, field);
      return { ...prev, customFields: next };
    });
    setActiveId(field.id);
  };

  const duplicateField = (id: string) => {
    const copyId = createFieldId();
    onChange((prev) => {
      const index = prev.customFields.findIndex((f) => f.id === id);
      if (index < 0) return prev;
      const next = [...prev.customFields];
      next.splice(index + 1, 0, {
        ...prev.customFields[index],
        id: copyId,
        options: [...prev.customFields[index].options],
      });
      return { ...prev, customFields: next };
    });
    setActiveId(copyId);
  };

  const moveField = (id: string, delta: number) =>
    onChange((prev) => {
      const index = prev.customFields.findIndex((f) => f.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= prev.customFields.length) return prev;
      const next = [...prev.customFields];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, customFields: next };
    });

  const removeField = (id: string) =>
    onChange((prev) => ({ ...prev, customFields: prev.customFields.filter((f) => f.id !== id) }));

  const changeType = (field: RsvpCustomField, type: RsvpCustomFieldType) =>
    updateField(field.id, {
      type,
      required: type === 'section' ? false : field.required,
      options: fieldNeedsOptions(type)
        ? field.options.length
          ? field.options
          : ['Option 1']
        : field.options,
    });

  const setOption = (field: RsvpCustomField, index: number, text: string) =>
    updateField(field.id, {
      options: field.options.map((o, i) => (i === index ? text : o)),
    });

  return (
    <Box sx={{ bgcolor: G_BG, borderRadius: 2, p: { xs: 1.5, sm: 3 } }}>
      <Stack spacing={2} sx={{ maxWidth: 770, mx: 'auto' }}>
        {/* Header */}
        <FormCard top>
          <TextField
            variant="standard"
            fullWidth
            placeholder={eventName || 'Form title'}
            value={value.formTitle}
            onChange={(e) => set({ formTitle: e.target.value })}
            helperText="Form title (leave empty to use the event name)"
            InputProps={{ sx: { fontSize: 28, fontWeight: 400 } }}
          />
          <TextField
            variant="standard"
            fullWidth
            multiline
            placeholder="Form description"
            value={value.formDescription}
            onChange={(e) => set({ formDescription: e.target.value })}
            sx={{ mt: 2 }}
          />
        </FormCard>

        {/* Guest details */}
        <FormCard>
          <Typography variant="subtitle1" gutterBottom>
            Guest details
          </Typography>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Name question"
                value={value.guestNameLabel}
                onChange={(e) => set({ guestNameLabel: e.target.value })}
                fullWidth
                helperText="Always required"
              />
              <TextField
                label="Name placeholder"
                value={value.guestNamePlaceholder}
                onChange={(e) => set({ guestNamePlaceholder: e.target.value })}
                fullWidth
              />
            </Stack>
            {(
              [
                ['email', 'Email'],
                ['phone', 'Phone'],
              ] as const
            ).map(([key, name]) => (
              <Stack key={key} direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={`${name} question`}
                  value={value[`${key}Label`]}
                  onChange={(e) => set({ [`${key}Label`]: e.target.value } as any)}
                  fullWidth
                />
                <TextField
                  label={`${name} placeholder`}
                  value={value[`${key}Placeholder`]}
                  onChange={(e) => set({ [`${key}Placeholder`]: e.target.value } as any)}
                  fullWidth
                />
                <TextField
                  select
                  label={`Ask for ${name.toLowerCase()}`}
                  value={value[`${key}Mode`]}
                  onChange={(e) => set({ [`${key}Mode`]: e.target.value } as any)}
                  sx={{ minWidth: 200 }}
                >
                  {MODE_OPTIONS.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            ))}
          </Stack>
        </FormCard>

        {/* Attendance */}
        <FormCard>
          <FormControlLabel
            control={
              <Switch
                checked={value.attendanceEnabled}
                onChange={(e) => set({ attendanceEnabled: e.target.checked })}
              />
            }
            label={<Typography variant="subtitle1">Attendance question</Typography>}
          />
          {value.attendanceEnabled && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Question"
                value={value.attendanceLabel}
                onChange={(e) => set({ attendanceLabel: e.target.value })}
                fullWidth
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Attending answer"
                  value={value.attendanceYesLabel}
                  onChange={(e) => set({ attendanceYesLabel: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Not attending answer"
                  value={value.attendanceNoLabel}
                  onChange={(e) => set({ attendanceNoLabel: e.target.value })}
                  fullWidth
                />
              </Stack>
            </Stack>
          )}
        </FormCard>

        {/* Plus-ones */}
        <FormCard>
          <FormControlLabel
            control={
              <Switch
                checked={value.plusOnesEnabled}
                onChange={(e) => set({ plusOnesEnabled: e.target.checked })}
              />
            }
            label={<Typography variant="subtitle1">Allow plus-ones</Typography>}
          />
          <Typography variant="body2" color="text.secondary">
            Guests can add extra people one at a time — a name for each, with phone and email
            optional.
            {value.attendanceEnabled ? ' Only shown to guests who are attending.' : ''}
          </Typography>
          {value.plusOnesEnabled && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Question"
                value={value.plusOnesLabel}
                onChange={(e) => set({ plusOnesLabel: e.target.value })}
                fullWidth
              />
              <TextField
                select
                label="Maximum extra guests"
                value={value.plusOnesMax}
                onChange={(e) => set({ plusOnesMax: Number(e.target.value) })}
                sx={{ minWidth: 200 }}
              >
                {Array.from({ length: MAX_PLUS_ONES }, (_, i) => i + 1).map((n) => (
                  <MenuItem key={n} value={n}>
                    Plus {n}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
        </FormCard>

        {/* Custom questions */}
        {fields.map((field, index) => {
          const active = activeId === field.id;
          const isSection = field.type === 'section';
          return (
            <FormCard key={field.id} active={active} onClick={() => setActiveId(field.id)}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    variant="filled"
                    fullWidth
                    label={isSection ? 'Title' : 'Question'}
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                  />
                  <TextField
                    select
                    value={field.type}
                    onChange={(e) => changeType(field, e.target.value as RsvpCustomFieldType)}
                    sx={{ minWidth: 220 }}
                    SelectProps={{
                      renderValue: (v) => {
                        const meta = FIELD_TYPES.find((t) => t.value === v);
                        return (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Iconify icon={meta?.icon || 'mdi:text-short'} width={20} />
                            <span>{meta?.label}</span>
                          </Stack>
                        );
                      },
                    }}
                  >
                    {FIELD_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        <Iconify icon={t.icon} width={20} sx={{ mr: 1.5 }} />
                        {t.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <TextField
                  variant="standard"
                  fullWidth
                  multiline
                  placeholder="Description (optional)"
                  value={field.description}
                  onChange={(e) => updateField(field.id, { description: e.target.value })}
                />

                {fieldNeedsOptions(field.type) && (
                  <Stack spacing={1}>
                    {field.options.map((option, i) => (
                      <Stack key={i} direction="row" spacing={1} alignItems="center">
                        {field.type === 'select' ? (
                          <Typography sx={{ width: 24, color: 'text.secondary' }}>{i + 1}.</Typography>
                        ) : (
                          <Iconify icon={optionIcon(field.type)} sx={{ color: 'text.disabled' }} />
                        )}
                        <TextField
                          variant="standard"
                          fullWidth
                          value={option}
                          placeholder={`Option ${i + 1}`}
                          onChange={(e) => setOption(field, i, e.target.value)}
                        />
                        <IconButton
                          size="small"
                          aria-label="Remove option"
                          onClick={() =>
                            updateField(field.id, {
                              options: field.options.filter((_, j) => j !== i),
                            })
                          }
                        >
                          <Iconify icon="mingcute:close-line" />
                        </IconButton>
                      </Stack>
                    ))}
                    <Box>
                      <Button
                        size="small"
                        onClick={() =>
                          updateField(field.id, {
                            options: [...field.options, `Option ${field.options.length + 1}`],
                          })
                        }
                      >
                        Add option
                      </Button>
                    </Box>
                  </Stack>
                )}

                {['text', 'textarea', 'number', 'email', 'phone', 'select'].includes(field.type) && (
                  <TextField
                    variant="standard"
                    fullWidth
                    label="Placeholder (optional)"
                    value={field.placeholder}
                    onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                  />
                )}

                <Divider />
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="space-between"
                >
                  {value.attendanceEnabled ? (
                    <TextField
                      select
                      size="small"
                      label="Show to"
                      value={field.showWhen}
                      onChange={(e) =>
                        updateField(field.id, { showWhen: e.target.value as RsvpShowWhen })
                      }
                      sx={{ minWidth: 220 }}
                    >
                      {SHOW_WHEN_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <span />
                  )}
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                    <Tooltip title="Move up">
                      <span>
                        <IconButton disabled={index === 0} onClick={() => moveField(field.id, -1)}>
                          <Iconify icon="mdi:arrow-up" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Move down">
                      <span>
                        <IconButton
                          disabled={index === fields.length - 1}
                          onClick={() => moveField(field.id, 1)}
                        >
                          <Iconify icon="mdi:arrow-down" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Duplicate">
                      <IconButton onClick={() => duplicateField(field.id)}>
                        <Iconify icon="mdi:content-copy" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => removeField(field.id)}>
                        <Iconify icon="mdi:delete-outline" />
                      </IconButton>
                    </Tooltip>
                    {!isSection && (
                      <>
                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                        <FormControlLabel
                          labelPlacement="start"
                          label="Required"
                          control={
                            <Switch
                              checked={field.required}
                              onChange={(e) =>
                                updateField(field.id, { required: e.target.checked })
                              }
                            />
                          }
                        />
                      </>
                    )}
                  </Stack>
                </Stack>
              </Stack>
            </FormCard>
          );
        })}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            variant="contained"
            sx={{ bgcolor: G_PURPLE, '&:hover': { bgcolor: '#5e35b1' } }}
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => addField('text')}
          >
            Add question
          </Button>
          <Button
            variant="outlined"
            sx={{ color: G_PURPLE, borderColor: G_PURPLE }}
            startIcon={<Iconify icon="mdi:format-title" />}
            onClick={() => addField('section')}
          >
            Add title & description
          </Button>
        </Stack>

        {/* Comments */}
        <FormCard>
          <FormControlLabel
            control={
              <Switch
                checked={value.commentsEnabled}
                onChange={(e) => set({ commentsEnabled: e.target.checked })}
              />
            }
            label={<Typography variant="subtitle1">Comments box at the end</Typography>}
          />
          {value.commentsEnabled && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Comments question"
                value={value.commentsLabel}
                onChange={(e) => set({ commentsLabel: e.target.value })}
                fullWidth
              />
              <TextField
                label="Comments placeholder"
                value={value.commentsPlaceholder}
                onChange={(e) => set({ commentsPlaceholder: e.target.value })}
                fullWidth
              />
            </Stack>
          )}
        </FormCard>
      </Stack>
    </Box>
  );
}
