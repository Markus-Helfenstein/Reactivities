import { observer } from "mobx-react-lite";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Header, Icon } from "semantic-ui-react";

interface Props {
    setFiles: (files: object[]) => void;
}

export default observer(function PhotoWidgetDropzone({setFiles} : Props) {
  const dzStyles = {
    border: 'dashed 3px #eee',
    borderColor: '#eee',
    borderRadius: '5px',
    textAlign: 'center' as 'center', // gets rid of warning because textAlign doesn't accept just any string
    height: 200
  }

  const dzActive = {
    borderColor: 'green'
  }

  const onDrop = useCallback((acceptedFiles: object[]) => {
    setFiles(acceptedFiles.map((file: any) => Object.assign(file, {
        preview: URL.createObjectURL(file)
    })))
  }, [setFiles]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div {...getRootProps()} style={isDragActive ? { ...dzStyles, ...dzActive } : dzStyles}>
      <input {...getInputProps()} />
      <Icon name="upload" size="huge" />
      <Header content="Drop image here" />
    </div>
  );
});