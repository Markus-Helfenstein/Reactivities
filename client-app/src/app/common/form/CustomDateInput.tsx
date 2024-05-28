import { useField } from "formik";
import { Form, Label } from "semantic-ui-react";
import DatePicker, {ReactDatePickerProps} from "react-datepicker";

// Partial makes all properties optional, as onChange doesn't have to be passed from the outside since we specify it implicitly
export default function CustomDateInput(props: Partial<ReactDatePickerProps>) {
  const [field, meta, helpers] = useField(props.name!);

  // "!!" casts into boolean, otherwise "&&" would yield the error string itself
  // "..." populates the input attributes
  // attributes that are specified explicitly later on may overwrite these populated attributes
  return (
    <Form.Field error={meta.touched && !!meta.error}>
      <DatePicker
        {...field}
        {...props}
        selected={(field.value && new Date(field.value)) || null}
        onChange={value => helpers.setValue(value)}
      />
      {meta.touched && meta.error ? (
        <Label basic color="red">
          {meta.error}
        </Label>
      ) : null}
    </Form.Field>
  );
}
