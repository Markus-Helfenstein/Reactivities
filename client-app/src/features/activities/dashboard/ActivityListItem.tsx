import { observer } from 'mobx-react-lite'
import { SyntheticEvent, useState } from 'react'
import { Button, Icon, Item, Label, Segment } from 'semantic-ui-react';
import { Activity } from '../../../app/models/activity';
import { useStore } from '../../../app/stores/store';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import ActivityListItemAttendee from './ActivityListItemAttendee';

interface Props {
    activity: Activity
}

export default observer(function ActivityListItem({activity}: Props) {
  const { activityStore } = useStore();
  const { deleteActivity, loading } = activityStore;
  const [deletionTarget, setDeletionTarget] = useState("");

  async function handleActivityDelete(event: SyntheticEvent<HTMLButtonElement>, id: string) {
    setDeletionTarget(event.currentTarget.name);
    return deleteActivity(id);
  }

  return (
		<Segment.Group>
			<Segment>
				{activity.isCancelled && <Label attached="top" color="red" content="Cancelled" style={{ textAlign: "center" }} />}
				<Item.Group>
					<Item>
						<Item.Image style={{ marginBottom: 6 }} size="tiny" circular src={activity.host?.image || "/assets/user.png"} />
						<Item.Content>
							<Item.Header as={Link} to={`/activities/${activity.id}`}>
								{activity.title}
							</Item.Header>
							{activity.host && activity.host.displayName && (
								<Item.Description>
									Hosted by <Link to={`/profiles/${activity.host.userName}`}>{activity.host.displayName}</Link>
								</Item.Description>
							)}
							{activity.isHost && (
								<Item.Description>
									<Label basic color="orange">
										You are hosting this activity
									</Label>
								</Item.Description>
							)}
							{activity.isGoing && !activity.isHost && (
								<Item.Description>
									<Label basic color="green">
										You are going to this activity
									</Label>
								</Item.Description>
							)}
						</Item.Content>
					</Item>
				</Item.Group>
			</Segment>
			<Segment>
				<span>
					<Icon name="clock" /> {format(activity.date!, "dd MMM yyyy h:mm aa")}
					<Icon name="marker" /> {activity.venue}
				</span>
			</Segment>
			<Segment secondary>
				<ActivityListItemAttendee attendees={activity.attendees!} />
			</Segment>
			<Segment clearing>
				<span
					style={{
						whiteSpace: "pre-wrap",
						width: "100%",
						overflow: "hidden",
						WebkitBoxOrient: "vertical",
						WebkitLineClamp: 3,
						display: "-webkit-box",
					}}
				>
					{activity.description}
				</span>
				<Button name={activity.id} loading={loading && deletionTarget === activity.id} onClick={(e) => handleActivityDelete(e, activity.id)} floated="right" content="Delete" color="red" />
				<Button as={Link} to={`/activities/${activity.id}`} color="teal" floated="right" content="View"></Button>
			</Segment>
		</Segment.Group>
  );
});
