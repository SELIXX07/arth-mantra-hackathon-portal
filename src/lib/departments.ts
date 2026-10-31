import { PES_DEPARTMENTS } from '@/types'

export const OTHER_OPTION = 'Other'

/**
 * Checks whether a given department string matches one of the predefined PES departments.
 */
export function isPredefinedDepartment(dept?: string): boolean {
  if (!dept) return false
  const trimmed = dept.trim().toLowerCase()
  if (trimmed === 'other' || trimmed.startsWith('other /') || trimmed.startsWith('other:') || trimmed.startsWith('other -')) {
    return false
  }
  return PES_DEPARTMENTS.some(
    d => d.toLowerCase() !== 'other' && !d.toLowerCase().startsWith('other /') && d.toLowerCase() === trimmed
  )
}

/**
 * Checks whether the department was chosen as "Other" or has a custom entered value.
 */
export function isOtherDepartment(dept?: string): boolean {
  if (!dept) return false
  const trimmed = dept.trim()
  if (trimmed === 'Other' || trimmed === 'Other / Department of Choice') return true
  if (trimmed.startsWith('Other:') || trimmed.startsWith('Other - ')) return true
  return !isPredefinedDepartment(trimmed)
}

/**
 * Returns the custom text entered by the user if "Other" was selected.
 */
export function getCustomDepartmentText(dept?: string): string {
  if (!dept) return ''
  const trimmed = dept.trim()
  if (trimmed === 'Other' || trimmed === 'Other / Department of Choice') return ''
  if (trimmed.startsWith('Other:')) return trimmed.replace(/^Other:\s*/, '')
  if (trimmed.startsWith('Other - ')) return trimmed.replace(/^Other\s*-\s*/, '')
  if (isOtherDepartment(trimmed)) return trimmed
  return ''
}

/**
 * Returns the dropdown value to select in the <select> element:
 * If it's a predefined department, returns it.
 * If it's custom or "Other", returns "Other".
 */
export function getSelectDepartmentValue(dept?: string): string {
  if (!dept) return ''
  if (isPredefinedDepartment(dept)) {
    const match = PES_DEPARTMENTS.find(d => d.toLowerCase() === dept.trim().toLowerCase())
    return match || dept
  }
  return OTHER_OPTION
}

/**
 * Formats the final department string to store in the database.
 */
export function formatDepartmentValue(baseOption: string, manualText: string): string {
  if (baseOption === 'Other' || baseOption === 'Other / Department of Choice' || isOtherDepartment(baseOption)) {
    const text = manualText.trim()
    return text ? `Other: ${text}` : 'Other'
  }
  return baseOption
}
