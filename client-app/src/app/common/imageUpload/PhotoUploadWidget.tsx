import { observer } from "mobx-react-lite";
import { Button, Grid, Header } from "semantic-ui-react";
import PhotoWidgetDropzone from "./PhotoWidgetDropzone";
import { useEffect, useState } from "react";
import PhotoWidgetCropper from "./PhotoWidgetCropper";

interface Props {
  isUploading: boolean;
  uploadPhoto: (file: Blob) => void;
}

export default observer(function PhotoUploadWidget({isUploading, uploadPhoto}: Props) {
    const [files, setFiles] = useState<{preview?: string}[]>([]);
    const [cropper, setCropper] = useState<Cropper>();

    function onCrop() {
        if (cropper) {
            cropper.getCroppedCanvas().toBlob(blob => uploadPhoto(blob!));
        }
    }

    useEffect(() => {
        // return cleanup delegate
        return () => {
            files.forEach(file => {
                if (file.preview) {
                    URL.revokeObjectURL(file.preview);
                }
            });
        }
    }, [files])

    return (
      <Grid>
        <Grid.Column width={4}>
          <Header color="teal" content="Step 1 - Add Photo" />
          <PhotoWidgetDropzone setFiles={setFiles} />
        </Grid.Column>
        <Grid.Column width={1} />
        <Grid.Column width={4}>
          <Header color="teal" content="Step 2 - Resize Image" />
          {files && files.length > 0 && files[0].preview && <PhotoWidgetCropper setCropper={setCropper} imagePreview={files[0].preview} />}
        </Grid.Column>
        <Grid.Column width={1} />
        <Grid.Column width={5}>
          <Header color="teal" content="Step 3 - Preview & Upload" />
          {files && files.length > 0 && (
            <>
                <div className="img-preview" style={{ minHeight: 200, overflow: "hidden" }} />
                <Button.Group widths={2}>
                <Button onClick={onCrop} loading={isUploading} positive icon="check" />
                <Button onClick={() => setFiles([])} disabled={isUploading} icon="close" />
                </Button.Group>
            </>
          )}
        </Grid.Column>
      </Grid>
    );
})