import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import { observer } from "mobx-react-lite";

interface Props {
    setCropper: (cropper: Cropper) => void;
    imagePreview: string;
}

export default observer(function PhotoWidgetCropper({setCropper, imagePreview}: Props) {
  return (
    <Cropper
      src={imagePreview}
      style={{ height: 200, width: "100%" }}
      initialAspectRatio={1}
      aspectRatio={1}
      preview=".img-preview" // CSS selector determines where preview is shown
      guides={false}
      viewMode={1}
      autoCropArea={1}
      background={false}
      onInitialized={setCropper}
    />
  );
})