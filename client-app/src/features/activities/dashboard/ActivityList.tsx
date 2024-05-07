import { SyntheticEvent, useState } from 'react';
import { Button, Item, Label, Segment } from 'semantic-ui-react';
import { useStore } from '../../../app/stores/store';
import { observer } from 'mobx-react-lite';

export default observer(function ActivityList() {
  const { activityStore } = useStore();
  const { activitiesByDate, deleteActivity, loading } = activityStore;
  const [deletionTarget, setDeletionTarget] = useState('');

  async function handleActivityDelete(event: SyntheticEvent<HTMLButtonElement>, id: string) {
    setDeletionTarget(event.currentTarget.name);
    return deleteActivity(id);
  }

  return (
    <Segment>
      <Item.Group divided>
        {activitiesByDate.map((activity) => (
          <Item key={activity.id}>
            <Item.Content>
              <Item.Header as="a">{activity.title}</Item.Header>
              <Item.Meta>{activity.date}</Item.Meta>
              <Item.Description>
                <div>{activity.description}</div>
                <div>
                  {activity.city}, {activity.venue}
                </div>
              </Item.Description>
              <Item.Extra>
                <Button onClick={() => activityStore.selectActivity(activity.id)} floated="right" content="View" color="blue" />
                <Button name={activity.id} loading={loading && deletionTarget === activity.id} onClick={(e) => handleActivityDelete(e, activity.id)} floated="right" content="Delete" color="red" />
                <Label basic content={activity.category} />
              </Item.Extra>
            </Item.Content>
          </Item>
        ))}
      </Item.Group>
    </Segment>
  );
});
