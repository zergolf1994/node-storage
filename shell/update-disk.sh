# Prepare values
function prep ()
{
	echo "$1" | sed -e 's/^ *//g' -e 's/ *$//g' | sed -n '1 p'
}

# Base64 values
function base ()
{
	echo "$1" | tr -d '\n' | base64 | tr -d '=' | tr -d '\n' | sed 's/\//%2F/g' | sed 's/\+/%2B/g'
}

# Integer values
function int ()
{
	echo ${1/\.*}
}

# Filter numeric
function num ()
{
	case $1 in
	    ''|*[!0-9\.]*) echo 0 ;;
	    *) echo $1 ;;
	esac
}

local_ip=$(hostname -I | awk '{print $1}')

disk_total=$(prep $(num "$(($(df -P -B 1 | grep '^/' | awk '{ print $2 }' | sed -e :a -e '$!N;s/\n/+/;ta')))"))
disk_used=$(prep $(num "$(($(df -P -B 1 | grep '^/' | awk '{ print $3 }' | sed -e :a -e '$!N;s/\n/+/;ta')))"))

data_post="sv_ip=$local_ip&disk_total=$disk_total&disk_used=$disk_used"
curl -sS "http://127.0.0.1:8888/disk/update?$data_post"