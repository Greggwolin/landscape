import type { ComparableLocation } from '@/components/valuation/AddComparableModal';
import type { ProjectSummary } from '@/app/components/ProjectProvider';

export function buildSubjectLocationFromProject(project?: ProjectSummary): ComparableLocation | undefined {
  if (!project) return undefined;

  const latitude = project.latitude ?? project.location_lat ?? null;
  const longitude = project.longitude ?? project.location_lon ?? null;
  const city = project.jurisdiction_city ?? project.location_description ?? project.location ?? undefined;

  const location: ComparableLocation = {};

  if (latitude != null) {
    location.latitude = latitude;
  }

  if (longitude != null) {
    location.longitude = longitude;
  }

  if (city) {
    location.city = city;
  }

  if (Object.keys(location).length === 0) {
    return undefined;
  }

  return location;
}
