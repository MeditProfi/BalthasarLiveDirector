#include "EXTERN.h"
#include "perl.h"
#include "XSUB.h"


#include "const-c.inc"


#ifdef WIN32

#include <windows.h>

#define _vflock _win32_flock

BOOL _set_lock(HANDLE osfh, int mode, __int64 len) {
	OVERLAPPED ovp;
	DWORD flags;
	BOOL rv;

	/* set lock mode */
	flags = (mode & 0x04) ? LOCKFILE_FAIL_IMMEDIATELY : 0;
        mode &= 0x0B;

	/* prepare fields in OVERLAPPED structure */
	len++;
	ovp.Offset = (DWORD) (len & 0xffffffff);
	ovp.OffsetHigh = (DWORD) (len >> 32);
	ovp.hEvent = 0;

	switch(mode) {
		case 0x02:
			flags |= LOCKFILE_EXCLUSIVE_LOCK;
		case 0x01:
			rv = LockFileEx(osfh, flags, 0, 1, 0, &ovp);
			break;
		case 0x08:
			rv = UnlockFileEx(osfh, 0, 1, 0, &ovp);
			break;
		default:
			SetLastError(ERROR_INVALID_PARAMETER);
			rv = FALSE;
	}

	return rv;
}

void _set_errno() {
	switch(GetLastError()) {
		case ERROR_INVALID_HANDLE:
		case ERROR_INVALID_PARAMETER: errno = EINVAL; break;
		case ERROR_LOCK_VIOLATION:
		case ERROR_IO_PENDING: errno = EAGAIN; break;
		default: errno = ERANGE;
	}
}

int _win32_flock(int fh, int mode) {
	__int64 len;
	BOOL rv;

	/* get OS file handle */
	HANDLE osfh = (HANDLE) _get_osfhandle(fh);
	if((int) osfh == -1) return 0;

	/* get file length */
	len = _filelengthi64(fh);

        /* lock/unlock */
	rv = _set_lock(osfh, mode, len);

	/* transform errors from WIN32 SDK-specific to perl */
	if(!rv) {
		_set_errno();
		return 0;
	}

	return 1;
}

#else

#include <unistd.h>
#include <fcntl.h>

#define _vflock _unix_flock

int _unix_flock(int fh, int mode) {
        struct flock flck;
        int op;

        /* prepare mandatory fields in flock structure */
        flck.l_whence = SEEK_SET;
        flck.l_start = 0;
        flck.l_len = 0;

        /* set lock mode */
        op = (mode & 0x04) ? F_SETLK : F_SETLKW;
        mode &= 0x0B;

        /* set lock operation */
        if(mode == 0x01)
                flck.l_type = F_RDLCK;
        else if(mode == 0x02)
                flck.l_type = F_WRLCK;
        else if(mode == 0x08)
                flck.l_type = F_UNLCK;
        else {
                errno = EINVAL;
                return 0;
        }

        return (fcntl(fh, op, &flck) == -1) ? 0 : 1;
}

#endif

MODULE = VIDI::Flock		PACKAGE = VIDI::Flock		

INCLUDE: const-xs.inc

int
vflock(pio, mode)
        PerlIO * pio
        int      mode
CODE:
	if(pio != 0) {
		RETVAL = _vflock(fileno(PerlIO_findFILE(pio)), mode);
	} else {
		errno = ENOENT;
		RETVAL = 0;
	}
OUTPUT:
        RETVAL
