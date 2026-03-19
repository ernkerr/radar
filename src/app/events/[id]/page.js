import EventDetail from '@/components/EventDetail';

export default function EventPage({ params }) {
  return <EventDetail eventId={params.id} />;
}
