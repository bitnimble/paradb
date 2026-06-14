'use client';

import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { useCallback, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Button } from 'ui/base/button/button';
import { FormError } from 'ui/base/form/form_error';
import { T } from 'ui/base/text/text';
import { Tooltip } from 'ui/base/tooltip/tooltip';
import styles from './avatar_crop_dialog.module.css';
import { ImageScaling } from './render_avatar';

type AvatarCropDialogProps = {
  /** Object URL of the image to crop. */
  source: string;
  submitting: boolean;
  error: string | undefined;
  onSave: (area: Area, scaling: ImageScaling) => void;
  onCancel: () => void;
};

export function AvatarCropDialog(props: AvatarCropDialogProps) {
  const { source, submitting, error, onSave, onCancel } = props;
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [scaling, setScaling] = useState<ImageScaling>('smooth');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSave = () => {
    if (croppedAreaPixels == null) {
      return;
    }
    onSave(croppedAreaPixels, scaling);
  };

  return (
    <BaseDialog.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={styles.backdrop} />
        <BaseDialog.Popup className={styles.dialog}>
          <T.Large>Crop your profile picture</T.Large>
          <div className={styles.cropArea}>
            <Cropper
              image={source}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <label className={styles.zoom}>
            <T.Small>Zoom</T.Small>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
          <div className={styles.scaling}>
            <T.Small>Image scaling:</T.Small>
            <Tooltip content="nearest-neighbour">
              <label className={styles.scalingOption}>
                <input
                  type="radio"
                  name="avatar-scaling"
                  checked={scaling === 'precise'}
                  onChange={() => setScaling('precise')}
                />
                <T.Small>Precise</T.Small>
              </label>
            </Tooltip>
            <Tooltip content="lanczos">
              <label className={styles.scalingOption}>
                <input
                  type="radio"
                  name="avatar-scaling"
                  checked={scaling === 'smooth'}
                  onChange={() => setScaling('smooth')}
                />
                <T.Small>Smooth</T.Small>
              </label>
            </Tooltip>
          </div>
          <FormError error={error} />
          <div className={styles.actions}>
            <Button style="regular" onClick={onCancel}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleSave}>
              Save
            </Button>
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
