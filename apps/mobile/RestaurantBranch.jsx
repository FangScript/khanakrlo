import React, { useState } from 'react';
import { CatalogueImage } from './MarketUI';
import { art as customerArt } from './CustomerUI';
import { Switch, Text, View } from 'react-native';
import {
  amountInPkr,
  blankHours,
  Button,
  Card,
  Choice,
  days,
  Field,
  Food,
  Heading,
  Hero,
  money,
  photos,
  Row,
  s,
  toPaisa,
} from './RestaurantUI';
export function Branches({ branches, select, go, application }) {
  return (
    <>
      <Heading title="Your branches" desc="Manage your restaurant branches and pickup locations." />
      {branches.map((b, i) => (
        <Row
          key={b.id}
          title={b.name}
          detail={[b.city, b.open ? 'Open' : 'Paused', b.role].filter(Boolean).join(' · ')}
          imageUrl={b.imageUrl}
          image={i % 2 ? photos.karahi : photos.biryani}
          onPress={() => select(b)}
        />
      ))}
      {!branches.length && (
        <Card>
          <Text style={s.body}>
            {application?.status === 'approved'
              ? 'Add your first pickup location.'
              : 'Approved restaurant branches will appear here.'}
          </Text>
        </Card>
      )}
      <Hero name="workspace" height={150} />
      {application?.status === 'approved' && (
        <Button label="Open branch" icon="plus" onPress={() => go('newBranch')} />
      )}
    </>
  );
}
export function Availability({ branch, save, go, busy, canManage, canStaff, publishPhoto }) {
  return (
    <>
      <Heading
        title="Branch availability"
        desc={[branch.name, branch.address].filter(Boolean).join(' · ')}
      />
      <CatalogueImage
        imageUrl={branch.imageUrl}
        fallback={customerArt.grill}
        style={{ height: 170, width: '100%', borderRadius: 17 }}
      />
      {canManage && <Choice label="Publish branch photo" disabled={busy} onPress={publishPhoto} />}
      <Text style={s.sub}>Choice</Text>
      {[
        [true, 'Open for orders'],
        [false, 'Pause new orders'],
      ].map(([value, label]) => (
        <Row
          key={label}
          title={label}
          icon={branch.open === value ? 'check' : 'clock'}
          active={branch.open === value}
          disabled={busy || !canManage}
          onPress={() => save({ open: value })}
        />
      ))}
      {canManage && (
        <View style={s.wrap}>
          <Choice label="Opening hours" onPress={() => go('hours')} />
          <Choice label="Service area" onPress={() => go('area')} />
          {canStaff && <Choice label="Staff" onPress={() => go('staff')} />}
        </View>
      )}
    </>
  );
}
const time = /^([01]\d|2[0-3]):[0-5]\d$/;
export function Hours({ branch, save, busy }) {
  const [rows, setRows] = useState(() =>
      blankHours().map((d) => ({ ...d, ...branch.hours?.find((h) => h.day === d.day) })),
    ),
    [day, select] = useState(1);
  const chosen = rows[day],
    update = (day, key, value) =>
      setRows((old) => old.map((r) => (r.day === day ? { ...r, [key]: value } : r)));
  return (
    <>
      <Heading title="Hours" desc={branch.name} />
      <Card>
        <Text style={s.sub}>Opening hours</Text>
        <Text style={s.body}>{days[day]}</Text>
        <View style={s.row}>
          {['open', 'close'].map((k) => (
            <View key={k} style={{ flex: 1 }}>
              <Field
                label={k === 'open' ? 'Opens (HH:MM)' : 'Closes (HH:MM)'}
                value={chosen[k]}
                set={(v) => update(day, k, v)}
                maxLength={5}
              />
            </View>
          ))}
        </View>
      </Card>
      <Card>
        <Text style={s.sub}>Weekly schedule</Text>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <View key={d} style={[s.row, { justifyContent: 'space-between' }]}>
            <Choice label={days[d]} on={d === day} onPress={() => select(d)} />
            <Text style={s.small}>
              {rows[d].enabled ? rows[d].open + ' – ' + rows[d].close : 'Closed'}
            </Text>
            <Switch
              accessibilityLabel={days[d] + ' enabled'}
              value={rows[d].enabled}
              onValueChange={(v) => update(d, 'enabled', v)}
            />
          </View>
        ))}
      </Card>
      <Button
        label="Save hours"
        disabled={
          busy ||
          rows.some(
            (d) => d.enabled && (!time.test(d.open) || !time.test(d.close) || d.open === d.close),
          )
        }
        onPress={() => save({ hours: rows })}
      />
    </>
  );
}
const roles = [
  ['manager', 'Branch manager', 'Branch management'],
  ['kitchen', 'Kitchen staff', 'Orders and pickup'],
  ['menu', 'Menu editor', 'Catalogue'],
];
export function Staff({ branch, save, busy }) {
  const [email, setEmail] = useState(''),
    [role, setRole] = useState('manager'),
    [form, show] = useState(false),
    [remove, confirmRemove] = useState('');
  return (
    <>
      <Heading title="Staff permissions" />
      <Hero name="orderKarahi" height={138} />
      <Text style={s.sub}>Branch staff</Text>
      {roles.map(([key, title, detail]) => (
        <Row
          key={key}
          title={title}
          detail={detail}
          icon={key === 'manager' ? 'star' : key === 'kitchen' ? 'shop' : 'orders'}
          onPress={() => {
            show(true);
            setRole(key);
          }}
          active={form && key === role}
        />
      ))}
      {branch.staff?.map((p) => (
        <Card key={p.id || p.email}>
          <Text style={s.sub}>{p.email}</Text>
          <Text style={s.small}>{p.role}</Text>
          {p.role !== 'owner' && (
            <Choice
              label={remove === p.email ? 'Confirm removal' : 'Remove access'}
              onPress={() =>
                remove === p.email ? save({ email: p.email, role: 'remove' }) : confirmRemove(p.email)
              }
            />
          )}
        </Card>
      ))}
      {form ? (
        <Card>
          <Field label="Staff account email" keyboardType="email-address" value={email} set={setEmail} />
          <Text style={s.body}>{roles.find((x) => x[0] === role)[1]}</Text>
          <Button
            label="Save access"
            disabled={busy || !/^\S+@\S+\.\S+$/.test(email)}
            onPress={() => save({ email: email.trim(), role })}
          />
        </Card>
      ) : (
        <Button label="Manage access" onPress={() => show(true)} />
      )}
    </>
  );
}
export function Menu({ branch, edit, canEdit }) {
  const [filter, setFilter] = useState('All');
  const menu = (branch.menu || []).filter(
    (d) => filter === 'All' || (filter === 'Available') === d.available,
  );
  return (
    <>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Heading title="Menu editor" />
        {canEdit && <Choice label="Add dish" icon="plus" onPress={() => edit(null)} />}
      </View>
      <View style={s.wrap}>
        {['All', 'Available', 'Sold out'].map((k) => (
          <Choice key={k} label={k} on={filter === k} onPress={() => setFilter(k)} />
        ))}
      </View>
      {menu.map((d) => (
        <Row
          key={d.id}
          title={d.name}
          image={photos[d.photo]}
          imageUrl={d.imageUrl}
          detail={(d.available ? 'Available' : 'Sold out') + ' · ' + money(d.price)}
          onPress={canEdit ? () => edit(d) : undefined}
        />
      ))}
      {!menu.length && (
        <Card>
          <Text style={s.body}>No dishes in this view.</Text>
        </Card>
      )}
    </>
  );
}
export function EditDish({ dish, save, busy, publishPhoto }) {
  const [name, setName] = useState(dish?.name || ''),
    [price, setPrice] = useState(dish ? amountInPkr(dish.price) : ''),
    [photo, setPhoto] = useState(dish?.photo || 'biryani'),
    [available, setAvailable] = useState(dish?.available ?? true);
  const [addon, setAddon] = useState(!!dish?.addon),
    [addonName, setAddonName] = useState(dish?.addon?.name || ''),
    [addonPrice, setAddonPrice] = useState(dish?.addon ? amountInPkr(dish.addon.price) : '');
  const valid =
    name.trim().length >= 2 &&
    toPaisa(price) > 0 &&
    (!addon || (addonName.trim().length > 0 && toPaisa(addonPrice) >= 0));
  return (
    <>
      <Heading title={dish ? 'Edit dish' : 'Add dish'} />
      <Food
        dish={{ photo, imageUrl: dish?.imageUrl }}
        style={{ width: '100%', height: 145, borderRadius: 17 }}
      />
      <Text style={s.small}>Catalogue artwork</Text>
      <View style={s.wrap}>
        {Object.keys(photos).map((p) => (
          <Choice
            key={p}
            label={p.charAt(0).toUpperCase() + p.slice(1)}
            on={photo === p}
            onPress={() => setPhoto(p)}
          />
        ))}
      </View>
      {dish?.id ? (
        <Choice label="Publish dish photo" disabled={busy} onPress={publishPhoto} />
      ) : (
        <Text style={s.small}>Save the dish to upload its own menu photo.</Text>
      )}
      <Field label="Dish name" value={name} set={setName} />
      <Field label="Price in PKR" value={price} set={setPrice} keyboardType="decimal-pad" />
      <Card>
        <View style={s.row}>
          <Text style={[s.sub, { flex: 1 }]}>Add-on</Text>
          <Switch accessibilityLabel="Offer add-on" value={addon} onValueChange={setAddon} />
        </View>
        {addon && (
          <>
            <Field label="Add-on name" value={addonName} set={setAddonName} />
            <Field
              label="Add-on price in PKR"
              value={addonPrice}
              set={setAddonPrice}
              keyboardType="decimal-pad"
            />
          </>
        )}
      </Card>
      <Card tone="green">
        <View style={s.row}>
          <Text style={[s.sub, { flex: 1 }]}>{available ? 'Available' : 'Sold out'}</Text>
          <Switch accessibilityLabel="Dish available" value={available} onValueChange={setAvailable} />
        </View>
      </Card>
      <Button
        label="Publish changes"
        disabled={busy || !valid}
        onPress={() =>
          save({
            ...(dish && { id: dish.id }),
            name: name.trim(),
            price: toPaisa(price),
            photo,
            available,
            addon: addon ? { name: addonName.trim(), price: toPaisa(addonPrice) } : null,
          })
        }
      />
    </>
  );
}
