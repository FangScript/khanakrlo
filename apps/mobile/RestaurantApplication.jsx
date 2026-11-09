import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Button, Card, Choice, documents, Field, Heading, Hero, Row, s } from './RestaurantUI';

export function Details({ initial, email, submit, busy, branch = false }) {
  const [name, setName] = useState(initial?.name || ''),
    [address, setAddress] = useState(initial?.address || ''),
    [contact, setContact] = useState(initial?.email || email || ''),
    [city, setCity] = useState(initial?.city || 'Islamabad');
  const valid =
    name.trim().length > 1 &&
    address.trim().length > 3 &&
    (branch || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim()));
  return (
    <>
      <Hero name="orderKarahi" height={150} />
      <Heading
        title={branch ? 'Open a branch' : 'Restaurant application'}
        desc={
          branch
            ? 'Add a pickup location for your restaurant.'
            : 'Add your restaurant details to join Khana Krlo.'
        }
      />
      <Field label={branch ? 'Branch name' : 'Restaurant name'} value={name} set={setName} />
      <Field label="Pickup address" value={address} set={setAddress} />
      <View style={s.wrap}>
        {['Islamabad', 'Rawalpindi'].map((c) => (
          <Choice key={c} label={c} on={c === city} onPress={() => setCity(c)} />
        ))}
      </View>
      {!branch && (
        <Field label="Contact email" keyboardType="email-address" value={contact} set={setContact} />
      )}
      <Button
        label={branch ? 'Open branch' : 'Continue'}
        disabled={busy || !valid}
        onPress={() =>
          submit({
            name: name.trim(),
            address: address.trim(),
            city,
            ...(!branch && { email: contact.trim() }),
          })
        }
      />
    </>
  );
}
export async function pickRestaurantFile(types, maxMiB) {
  const result = await DocumentPicker.getDocumentAsync({
    type: types,
    base64: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return;
  const asset = result.assets[0];
  if (!asset.size || asset.size > maxMiB * 1024 * 1024)
    throw Error('Choose a file up to ' + maxMiB + ' MB.');
  const mime =
    asset.mimeType ||
    { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }[
      asset.name.toLowerCase().split('.').pop()
    ];
  if (!types.includes(mime)) throw Error('Choose one of the listed file formats.');
  let base64 = Platform.OS === 'web' ? asset.base64 || asset.uri : await new File(asset.uri).base64();
  if (base64.includes(',')) base64 = base64.slice(base64.indexOf(',') + 1);
  return { name: asset.name, mime, base64 };
}
export function Evidence({ application, terms, upload, submit, busy, run }) {
  const [accepted, accept] = useState(false),
    [expanded, expand] = useState(false);
  async function pick(kind) {
    const types = kind === 'photo' ? ['image/jpeg', 'image/png'] : ['application/pdf', 'image/jpeg'];
    const file = await pickRestaurantFile(types, kind === 'photo' ? 10 : 5);
    if (file) await upload({ kind, ...file });
  }
  const docs = application?.documents || [];
  return (
    <>
      <Heading title="Application documents" desc="Upload the required evidence for verification." />
      {documents.map(([kind, title]) => {
        const found = docs.find((d) => d.kind === kind);
        return (
          <Row
            key={kind}
            title={title}
            detail={
              found
                ? found.name
                : kind === 'photo'
                  ? 'JPG or PNG · up to 10 MB'
                  : 'PDF or JPG · up to 5 MB'
            }
            icon={found ? 'check' : 'orders'}
            onPress={() => run(() => pick(kind))}
            disabled={busy}
          />
        );
      })}
      <Row title="Review terms" icon="info" onPress={() => expand(!expanded)} />
      {expanded && (
        <Card>
          <Text style={s.body}>{terms?.text}</Text>
          <Text style={s.small}>Version {terms?.version}</Text>
        </Card>
      )}
      <Choice
        label={accepted ? 'Terms accepted' : 'I accept the terms and policies'}
        icon="check"
        on={accepted}
        onPress={() => accept(!accepted)}
      />
      <Button
        label="Submit for review"
        disabled={busy || !accepted || !documents.every(([k]) => docs.some((d) => d.kind === k))}
        onPress={() => submit(terms.version)}
      />
    </>
  );
}
export function ApplicationStatus({ application, go }) {
  const status = application.status;
  const date = application.submittedAt
    ? new Date(application.submittedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })
    : '';
  return (
    <>
      <Heading title="Application status" desc="Track the progress of your restaurant application." />
      <Card>
        <Row title="Application submitted" detail={date || application.name} icon="check" />
        <Row
          title="Documents received"
          detail={(application.documents || []).length + ' files attached'}
          icon="check"
        />
        <Row
          title={
            status === 'approved'
              ? 'Application approved'
              : status === 'rejected'
                ? 'Changes requested'
                : 'Pending review'
          }
          detail={
            status === 'rejected'
              ? application.reason
              : status === 'approved'
                ? 'Your restaurant workspace is ready.'
                : 'In review by our team'
          }
          icon={status === 'approved' ? 'check' : 'clock'}
          active
        />
      </Card>
      <Hero name="orderRice" height={180} />
      {status === 'approved' && <Button label="Manage branches" onPress={() => go('branches')} />}{' '}
      {status === 'rejected' && <Button label="Update application" onPress={() => go('apply')} />}
    </>
  );
}
