import { observer } from 'mobx-react-lite'
import { SyntheticEvent, useState } from 'react'
import { Button, Icon, Item, Segment } from 'semantic-ui-react';
import { Activity } from '../../../app/models/activity';
import { useStore } from '../../../app/stores/store';
import { Link } from 'react-router-dom';

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
        <Item.Group>
          <Item>
            <Item.Image size="tiny" circular src="/assets/user.png" />
            <Item.Content>
              <Item.Header as={Link} to={`/activities/${activity.id}`}>
                {activity.title}
              </Item.Header>
              <Item.Description>Hosted by TODO</Item.Description>
            </Item.Content>
          </Item>
        </Item.Group>
      </Segment>
      <Segment>
        <span>
          <Icon name="clock" /> {activity.date}
          <Icon name="marker" /> {activity.venue}
        </span>
      </Segment>
      <Segment secondary>Attendees TODO</Segment>
      <Segment clearing>
        <span>{activity.description}</span>
        <Button name={activity.id} loading={loading && deletionTarget === activity.id} onClick={(e) => handleActivityDelete(e, activity.id)} floated="right" content="Delete" color="red" />
        <Button as={Link} to={`/activities/${activity.id}`} color="teal" floated="right" content="View"></Button>
      </Segment>
    </Segment.Group>
  );
});
