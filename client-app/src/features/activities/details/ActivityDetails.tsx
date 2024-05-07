import { Card, CardContent, CardHeader, CardMeta, CardDescription, Image, Button } from 'semantic-ui-react';
import { useStore } from '../../../app/stores/store';
import LoadingComponent from '../../../app/layout/LoadingComponent';
import { observer } from 'mobx-react-lite';

export default observer(function ActivityDetails() {
  const { activityStore } = useStore();
  const { selectedActivity, openForm, cancelSelectActivity } = activityStore;

  if (!selectedActivity) return <LoadingComponent />;

  return (
    <Card fluid>
      <Image src={`/assets/categoryImages/${selectedActivity.category}.jpg`} />
      <CardContent>
        <CardHeader>{selectedActivity.title}</CardHeader>
        <CardMeta>
          <span>{selectedActivity.date}</span>
        </CardMeta>
        <CardDescription>{selectedActivity.description}</CardDescription>
      </CardContent>
      <CardContent extra>
        <Button.Group widths="2">
          <Button onClick={() => openForm(selectedActivity.id)} basic color="blue" content="Edit" />
          <Button onClick={cancelSelectActivity} basic color="grey" content="Cancel" />
        </Button.Group>
      </CardContent>
    </Card>
  );
});
