import { useField } from "formik";
import { Form, Label, Select } from "semantic-ui-react";

// names must match official select attributes
interface Props {
  placeholder: string;
  name: string;
  options: { text: string, value:string }[];
  label?: string;
}

export default function CustomSelectInput(props: Props) {
  const [field, meta, helpers] = useField(props.name);

  // "!!" casts into boolean, otherwise "&&" would yield the error string itself
  return (
    <Form.Field error={meta.touched && !!meta.error}>
      <label>{props.label}</label>
      <Select 
        clearable 
        options={props.options} 
        value={field.value || null} 
        onChange={(_event, data) => helpers.setValue(data.value)} 
        onBlur={() => helpers.setTouched(true)} 
        placeholder={props.placeholder} 
      />
      {meta.touched && meta.error ? (
        <Label basic color="red">
          {meta.error}
        </Label>
      ) : null}
    </Form.Field>
  );
}
