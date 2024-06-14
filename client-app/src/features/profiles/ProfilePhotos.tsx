import { observer } from "mobx-react-lite";
import { Button, Card, Grid, Header, Image, TabPane } from "semantic-ui-react";
import { IPhoto, Profile } from "../../app/models/profile";
import { useStore } from "../../app/stores/store";
import { SyntheticEvent, useState } from "react";
import PhotoUploadWidget from "../../app/common/imageUpload/PhotoUploadWidget";

interface Props {
  profile: Profile;
}

export default observer(function ProfilePhotos({profile}: Props) {
    const {profileStore: {isCurrentUser, uploadPhoto, isUploading, isLoading, setMainPhoto, deletePhoto}} = useStore();
    const [addPhotoMode, setAddPhotoMode] = useState(false);
    const [target, setTarget] = useState('');

    async function handlePhotoUpload(file: Blob) {
      await uploadPhoto(file);
      setAddPhotoMode(false);
    }

    async function handleSetMainPhoto(photo: IPhoto, e: SyntheticEvent<HTMLButtonElement>) {
      setTarget(e.currentTarget.name);
      return setMainPhoto(photo);
    }

    async function handleDeletePhoto(photo: IPhoto, e: SyntheticEvent<HTMLButtonElement>) {
      setTarget(e.currentTarget.name);
      return deletePhoto(photo.id);
    }

    return (
      <TabPane>
        <Grid>
          <Grid.Column width={16}>
            <Header floated="left" icon="image" content="Photos" />
            {isCurrentUser && (
                <Button floated="right" basic 
                    content={addPhotoMode ? 'Cancel' : 'Add Photo'} 
                    onClick={() => setAddPhotoMode(!addPhotoMode)}
                />
            )}
          </Grid.Column>
          <Grid.Column width={16}>
            {addPhotoMode ? (
                <PhotoUploadWidget uploadPhoto={handlePhotoUpload} isUploading={isUploading} />
            ) : (
                <Card.Group itemsPerRow={5}>
                    {profile.photos?.map((photo) => (
                        <Card key={photo.id}>
                          <Image src={photo.url} />
                          {isCurrentUser && (
                            <Button.Group fluid widths={2}>
                              <Button basic color="green" content="Main" name={`setMain_${photo.id}`} disabled={isLoading || photo.isMain} 
                                onClick={e => handleSetMainPhoto(photo, e)}
                                loading={target === `setMain_${photo.id}` && isLoading}
                              />
                              <Button basic color="red" icon="trash" name={`delete_${photo.id}`} disabled={isLoading || photo.isMain} 
                                onClick={e => handleDeletePhoto(photo, e)}
                                loading={target === `delete_${photo.id}` && isLoading}
                              />
                            </Button.Group>
                          )}
                        </Card>
                    ))}
                </Card.Group>                
            )}
          </Grid.Column>
        </Grid>
      </TabPane>
    );
})